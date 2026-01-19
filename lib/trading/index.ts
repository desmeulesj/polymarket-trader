import { TradingMode } from '@prisma/client';
import { PaperBroker } from './paper-broker';
import { LiveBroker } from './live-broker';
import { ShadowBroker } from './shadow-broker';
import { Broker, BrokerConfig, SlippageModel } from './types';

export * from './types';
export { PaperBroker } from './paper-broker';
export { LiveBroker } from './live-broker';
export { ShadowBroker } from './shadow-broker';

/**
 * Create a broker for the specified trading mode
 */
export function createBroker(
    mode: TradingMode,
    userId: string,
    options: {
        slippageModel?: SlippageModel;
        feeRate?: number;
    } = {}
): Broker {
    const config: BrokerConfig = {
        mode,
        userId,
        slippageModel: options.slippageModel,
        feeRate: options.feeRate,
    };

    switch (mode) {
        case 'PAPER':
            return new PaperBroker(config);
        case 'LIVE':
            return new LiveBroker(config);
        case 'SHADOW':
            return new ShadowBroker(config);
        default:
            throw new Error(`Unknown trading mode: ${mode}`);
    }
}

/**
 * Get the current active trading mode for a user
 */
export async function getUserTradingMode(): Promise<TradingMode> {
    // Default to PAPER mode
    // In production, this would read from user preferences or session
    return process.env.DEFAULT_TRADING_MODE as TradingMode || 'PAPER';
}

/**
 * Mode-aware broker that can switch between modes
 */
export class TradingManager {
    private brokers: Map<TradingMode, Broker> = new Map();
    private currentMode: TradingMode;
    private userId: string;

    constructor(userId: string, initialMode: TradingMode = 'PAPER') {
        this.userId = userId;
        this.currentMode = initialMode;
    }

    /**
     * Get the current trading mode
     */
    get mode(): TradingMode {
        return this.currentMode;
    }

    /**
     * Switch trading mode
     */
    async setMode(mode: TradingMode): Promise<void> {
        this.currentMode = mode;
    }

    /**
     * Get the broker for the current mode
     */
    getBroker(): Broker {
        let broker = this.brokers.get(this.currentMode);

        if (!broker) {
            broker = createBroker(this.currentMode, this.userId);
            this.brokers.set(this.currentMode, broker);
        }

        return broker;
    }

    /**
     * Get broker for a specific mode
     */
    getBrokerForMode(mode: TradingMode): Broker {
        let broker = this.brokers.get(mode);

        if (!broker) {
            broker = createBroker(mode, this.userId);
            this.brokers.set(mode, broker);
        }

        return broker;
    }
}
