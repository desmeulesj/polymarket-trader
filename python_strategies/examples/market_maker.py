"""
Example Strategy: Market Maker

This strategy provides liquidity by placing buy and sell orders
around the midpoint price. It aims to profit from the spread.
"""

from sdk import (
    Context, Position, MarketState, Order,
    log, get_market, get_position, buy, sell
)

# Strategy parameters (can be overridden via config)
SPREAD_PERCENT = 0.02  # 2% spread on each side
ORDER_SIZE = 10  # USDC per order
MAX_POSITION = 100  # Max position per market
REFRESH_THRESHOLD = 0.01  # Refresh orders if price moves >1%

# Track last order prices
_last_prices = {}

def initialize(config: dict) -> None:
    """Initialize market maker strategy"""
    global SPREAD_PERCENT, ORDER_SIZE, MAX_POSITION
    
    SPREAD_PERCENT = config.get('spread_percent', SPREAD_PERCENT)
    ORDER_SIZE = config.get('order_size', ORDER_SIZE)
    MAX_POSITION = config.get('max_position', MAX_POSITION)
    
    log(f"Market Maker initialized: spread={SPREAD_PERCENT}, size={ORDER_SIZE}")

def on_tick(market_state: dict) -> None:
    """
    Track price movements for order refresh logic.
    """
    market_id = market_state.get('market_id')
    midpoint = market_state.get('midpoint', 0.5)
    
    last_price = _last_prices.get(market_id)
    if last_price:
        change = abs(midpoint - last_price) / last_price
        if change > REFRESH_THRESHOLD:
            log(f"Price moved {change*100:.1f}% - orders may need refresh")
    
    _last_prices[market_id] = midpoint

def propose_orders(context: dict) -> list:
    """
    Generate market making orders.
    Places buy below midpoint and sell above midpoint.
    """
    orders = []
    
    target_markets = context.get('parameters', {}).get('market_ids', [])
    positions = context.get('positions', [])
    balance = context.get('balance', 0)
    market_data = context.get('market_data', {})
    
    for market_id in target_markets:
        market = market_data.get(market_id)
        if not market:
            continue
        
        position = get_position(positions, market_id)
        current_size = position.get('size', 0) if position else 0
        
        midpoint = market.get('midpoint', 0.5)
        spread = market.get('spread', 0.1)
        
        # Calculate quote prices
        buy_price = midpoint * (1 - SPREAD_PERCENT)
        sell_price = midpoint * (1 + SPREAD_PERCENT)
        
        # Ensure our spread is at least as wide as market spread
        if sell_price - buy_price < spread:
            buy_price = midpoint - spread / 2
            sell_price = midpoint + spread / 2
        
        # Place buy order if position allows
        if current_size < MAX_POSITION:
            buy_size = min(ORDER_SIZE, MAX_POSITION - current_size)
            if buy_size > 0 and balance >= buy_size * buy_price:
                orders.append({
                    'market_id': market_id,
                    'token_id': market.get('token_id'),
                    'side': 'BUY',
                    'type': 'LIMIT',
                    'size': buy_size,
                    'price': round(buy_price, 4),
                })
        
        # Place sell order if we have position
        if current_size > 0:
            sell_size = min(ORDER_SIZE, current_size)
            orders.append({
                'market_id': market_id,
                'token_id': market.get('token_id'),
                'side': 'SELL',
                'type': 'LIMIT',
                'size': sell_size,
                'price': round(sell_price, 4),
            })
    
    log(f"Proposing {len(orders)} orders")
    return orders

def risk_check(order: dict, context: dict) -> bool:
    """
    Risk checks for market maker.
    """
    positions = context.get('positions', [])
    position = get_position(positions, order.get('market_id'))
    current_size = position.get('size', 0) if position else 0
    
    # Don't exceed max position
    if order.get('side') == 'BUY':
        if current_size + order.get('size', 0) > MAX_POSITION:
            log(f"Risk check failed: would exceed max position {MAX_POSITION}")
            return False
    
    # Don't sell more than we have
    if order.get('side') == 'SELL':
        if order.get('size', 0) > current_size:
            log(f"Risk check failed: sell size > position")
            return False
    
    # Price sanity check
    price = order.get('price', 0)
    if price < 0.01 or price > 0.99:
        log(f"Risk check failed: price {price} out of range")
        return False
    
    return True
