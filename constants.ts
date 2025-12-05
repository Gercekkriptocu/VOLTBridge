import { ChainId, Token } from './types';

export const BRIDGE_FEE_PERCENT = 0.001; // 0.1%

// NOTE: In a real production app, these would be the Smart Contract addresses for the bridge Vaults.
// For this dapp, we use a burn/safe address or you can replace it with your own wallet for testing.
export const BRIDGE_VAULT_ADDRESS_EVM = "0x000000000000000000000000000000000000dEaD"; 
export const BRIDGE_VAULT_ADDRESS_SOL = "11111111111111111111111111111111"; // System Program (Burn-ish for SOL)

export const BASE_CHAIN_ID = 8453; // 0x2105
export const BASE_RPC_URL = "https://mainnet.base.org";

export const TOKENS: Record<ChainId, Token[]> = {
  [ChainId.BASE]: [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png?v=026',
      address: 'native',
      decimals: 18,
      chainId: ChainId.BASE,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=026',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Native USDC
      decimals: 6,
      chainId: ChainId.BASE,
    },
  ],
  [ChainId.SOLANA]: [
    {
      symbol: 'SOL',
      name: 'Solana',
      icon: 'https://cryptologos.cc/logos/solana-sol-logo.png?v=026',
      address: 'native',
      decimals: 9,
      chainId: ChainId.SOLANA,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=026',
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Solana USDC
      decimals: 6,
      chainId: ChainId.SOLANA,
    },
  ],
};

export const MOCK_RATES = {
  ETH_TO_SOL: 18.5, 
  SOL_TO_ETH: 0.054, 
  USDC_TO_USDC: 1.0, 
};
