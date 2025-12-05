import { ethers } from 'ethers';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { BRIDGE_VAULT_ADDRESS_EVM, BRIDGE_VAULT_ADDRESS_SOL, BASE_CHAIN_ID, TOKENS } from '../constants';
import { ChainId } from '../types';

declare global {
  interface Window {
    ethereum: any;
    solana: any;
  }
}

// --- EVM HELPER (BASE) ---

export const connectEVM = async (): Promise<{ address: string; chainId: number }> => {
  if (!window.ethereum) throw new Error("No crypto wallet found. Please install MetaMask or Coinbase Wallet.");
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  const network = await provider.getNetwork();
  
  return {
    address: accounts[0],
    chainId: Number(network.chainId)
  };
};

export const switchChainToBase = async () => {
    if (!window.ethereum) return;
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }], // 8453
        });
    } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                    {
                        chainId: '0x2105',
                        chainName: 'Base Mainnet',
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                        rpcUrls: ['https://mainnet.base.org'],
                        blockExplorerUrls: ['https://basescan.org'],
                    },
                ],
            });
        } else {
            throw switchError;
        }
    }
};

export const getBalanceEVM = async (address: string, tokenAddress: string): Promise<string> => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    if (tokenAddress === 'native') {
        const balance = await provider.getBalance(address);
        return ethers.formatEther(balance);
    } else {
        const contract = new ethers.Contract(tokenAddress, ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"], provider);
        const balance = await contract.balanceOf(address);
        const decimals = await contract.decimals();
        return ethers.formatUnits(balance, decimals);
    }
};

export const sendTransactionEVM = async (amount: string, tokenAddress: string): Promise<string> => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    if (tokenAddress === 'native') {
        const tx = await signer.sendTransaction({
            to: BRIDGE_VAULT_ADDRESS_EVM,
            value: ethers.parseEther(amount)
        });
        return tx.hash;
    } else {
        const contract = new ethers.Contract(tokenAddress, [
            "function transfer(address to, uint256 amount) returns (bool)", 
            "function decimals() view returns (uint8)"
        ], signer);
        const decimals = await contract.decimals();
        const tx = await contract.transfer(BRIDGE_VAULT_ADDRESS_EVM, ethers.parseUnits(amount, decimals));
        return tx.hash;
    }
};

// --- SOLANA HELPER ---

const getSolanaProvider = () => {
    if ("solana" in window) {
        const provider = window.solana;
        if (provider.isPhantom) return provider;
    }
    // Fallback for Solflare or others injected differently, simplifying for now
    return window.solana; 
};

export const connectSolana = async (): Promise<{ address: string }> => {
    const provider = getSolanaProvider();
    if (!provider) throw new Error("Solana wallet not found. Please install Phantom.");
    
    // Connect
    const resp = await provider.connect();
    return { address: resp.publicKey.toString() };
};

export const getBalanceSolana = async (address: string, tokenAddress: string): Promise<string> => {
    // Use a public RPC endpoint. In prod, use a paid QuickNode/Helius endpoint.
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const pubKey = new PublicKey(address);

    if (tokenAddress === 'native') {
        const balance = await connection.getBalance(pubKey);
        return (balance / LAMPORTS_PER_SOL).toString();
    } else {
        // Fetch SPL Token Balance
        // We use a simplified parsed account info fetch
        const tokenPubKey = new PublicKey(tokenAddress);
        try {
             const accounts = await connection.getParsedTokenAccountsByOwner(pubKey, { mint: tokenPubKey });
             if (accounts.value.length > 0) {
                 return accounts.value[0].account.data.parsed.info.tokenAmount.uiAmountString || "0";
             }
             return "0";
        } catch (e) {
            console.error("Error fetching SPL balance", e);
            return "0";
        }
    }
};

export const sendTransactionSolana = async (amount: string, tokenAddress: string): Promise<string> => {
    const provider = getSolanaProvider();
    if (!provider) throw new Error("Wallet not connected");

    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const fromPubkey = new PublicKey(provider.publicKey.toString());
    const toPubkey = new PublicKey(BRIDGE_VAULT_ADDRESS_SOL);

    const transaction = new Transaction();
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    if (tokenAddress === 'native') {
        const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
        transaction.add(
            SystemProgram.transfer({
                fromPubkey,
                toPubkey, // Note: In reality, you send to the Bridge PDA
                lamports: Math.floor(lamports),
            })
        );
    } else {
        // Logic for SPL Token Transfer (Requires @solana/spl-token imports usually)
        // For this demo implementation to avoid massive polyfill issues with buffer in some envs:
        // We throw an error suggesting using SOL for the test or implement raw instruction if possible.
        // However, since we added spl-token to importmap, we could try constructing the instruction.
        // Simplifying for stability:
        throw new Error("SPL Token transfer requires advanced serialization. Please test with SOL or integrate Token Program instructions.");
    }

    const signed = await provider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    return signature;
};