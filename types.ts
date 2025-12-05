export enum ChainId {
  BASE = 'base',
  SOLANA = 'solana'
}

export interface Token {
  symbol: string;
  name: string;
  icon: string;
  address: string; // Contract address or 'native'
  decimals: number;
  chainId: ChainId;
}

export interface WalletState {
  address: string | null;
  connected: boolean;
  chainId: ChainId | null;
  balance: string;
  isCorrectChain?: boolean;
}

export interface BridgeTransaction {
  id: string;
  fromChain: ChainId;
  toChain: ChainId;
  fromAmount: string;
  toAmount: string;
  tokenSymbol: string;
  status: 'pending' | 'completed' | 'failed' | 'processing';
  timestamp: number;
  txHash?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
