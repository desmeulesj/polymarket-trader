"""
Python Strategy SDK for PolyTrader

This SDK provides a safe interface for strategies to interact
with market data and trading functionality.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

class TradingMode(Enum):
    PAPER = "PAPER"
    LIVE = "LIVE"  
    SHADOW = "SHADOW"

class OrderSide(Enum):
    BUY = "BUY"
    SELL = "SELL"

class OrderType(Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    GTC = "GTC"  # Good Till Cancelled
    GTD = "GTD"  # Good Till Date
    FOK = "FOK"  # Fill or Kill
    FAK = "FAK"  # Fill and Kill

@dataclass
class MarketState:
    """Current state of a market"""
    market_id: str
    token_id: str
    bid: float
    ask: float
    midpoint: float
    spread: float
    volume: float
    last_price: Optional[float] = None

@dataclass 
class Position:
    """User's position in a market"""
    market_id: str
    token_id: str
    size: float
    avg_entry_price: float
    current_price: Optional[float] = None
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0

@dataclass
class Order:
    """Order to be placed"""
    market_id: str
    token_id: str
    side: OrderSide
    type: OrderType
    size: float
    price: Optional[float] = None

@dataclass
class Context:
    """Context passed to strategy functions"""
    mode: TradingMode
    positions: List[Position]
    balance: float
    market_data: Dict[str, MarketState]
    parameters: Dict[str, Any]

class MarketData:
    """
    Interface for fetching market data.
    This is a stub that will be populated by the executor.
    """
    _data: Dict[str, MarketState] = {}
    
    @classmethod
    def get(cls, market_id: str) -> Optional[MarketState]:
        """Get market state for a specific market"""
        return cls._data.get(market_id)
    
    @classmethod
    def get_all(cls) -> Dict[str, MarketState]:
        """Get all available market data"""
        return cls._data.copy()
    
    @classmethod
    def orderbook(cls, market_id: str) -> Dict[str, List]:
        """Get order book for a market (simplified)"""
        market = cls._data.get(market_id)
        if not market:
            return {"bids": [], "asks": []}
        return {
            "bids": [[market.bid, 100]],  # Simplified
            "asks": [[market.ask, 100]],
        }

class Trading:
    """
    Interface for trading operations.
    This is a stub that will be populated by the executor.
    """
    _broker = None
    _pending_orders: List[Order] = []
    
    @classmethod
    def place_order(
        cls,
        market_id: str,
        token_id: str,
        side: str,
        order_type: str,
        size: float,
        price: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Queue an order to be placed.
        Returns a dict with order details.
        """
        order = Order(
            market_id=market_id,
            token_id=token_id,
            side=OrderSide(side),
            type=OrderType(order_type),
            size=size,
            price=price,
        )
        cls._pending_orders.append(order)
        return {
            "queued": True,
            "order": {
                "market_id": market_id,
                "side": side,
                "type": order_type,
                "size": size,
                "price": price,
            }
        }
    
    @classmethod
    def cancel_order(cls, order_id: str) -> Dict[str, Any]:
        """Cancel an order"""
        # Stub - will be implemented by executor
        return {"cancelled": True, "order_id": order_id}
    
    @classmethod
    def get_pending_orders(cls) -> List[Order]:
        """Get list of pending orders"""
        return cls._pending_orders.copy()
    
    @classmethod
    def clear_pending_orders(cls) -> None:
        """Clear pending orders (called by executor after processing)"""
        cls._pending_orders = []

# Convenience functions for strategies
def log(message: str) -> None:
    """Log a message (visible in run logs)"""
    print(f"[STRATEGY] {message}")

def get_market(market_id: str) -> Optional[MarketState]:
    """Get market data for a specific market"""
    return MarketData.get(market_id)

def get_position(positions: List[Position], market_id: str) -> Optional[Position]:
    """Find a position for a specific market"""
    for pos in positions:
        if pos.market_id == market_id:
            return pos
    return None

def buy(
    market_id: str,
    token_id: str,
    size: float,
    price: Optional[float] = None,
    order_type: str = "LIMIT"
) -> Dict[str, Any]:
    """Place a buy order"""
    return Trading.place_order(
        market_id=market_id,
        token_id=token_id,
        side="BUY",
        order_type=order_type,
        size=size,
        price=price,
    )

def sell(
    market_id: str,
    token_id: str,
    size: float,
    price: Optional[float] = None,
    order_type: str = "MARKET"
) -> Dict[str, Any]:
    """Place a sell order"""
    return Trading.place_order(
        market_id=market_id,
        token_id=token_id,
        side="SELL",
        order_type=order_type,
        size=size,
        price=price,
    )
