import React from 'react';
import { Wallet, Loader2, LogOut } from 'lucide-react';
import { ChainId } from '../types';

interface WalletButtonProps {
  chainId: ChainId;
  address: string | null;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading?: boolean;
}

const WalletButton: React.FC<WalletButtonProps> = ({ 
  chainId, 
  address, 
  connected, 
  onConnect, 
  onDisconnect,
  isLoading 
}) => {
  const isBase = chainId === ChainId.BASE;
  const bgColor = isBase ? 'bg-base-blue' : 'bg-solana-purple';
  const hoverColor = isBase ? 'hover:bg-blue-600' : 'hover:bg-purple-600';
  const label = isBase ? 'Base' : 'Solana';

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className={`px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 flex items-center gap-2 shadow-sm`}>
          <div className={`w-2 h-2 rounded-full ${bgColor}`}></div>
          <span className="text-sm font-medium text-gray-200">
            {address.slice(0, 4)}...{address.slice(-4)}
          </span>
        </div>
        <button 
          onClick={onDisconnect}
          className="p-2 text-gray-400 hover:text-red-400 transition"
          title="Disconnect"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={isLoading}
      className={`px-5 py-2.5 rounded-xl font-medium text-white shadow-lg transition-all duration-200 flex items-center gap-2 ${bgColor} ${hoverColor} ${isLoading ? 'opacity-80' : ''}`}
    >
      {isLoading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Wallet size={18} />
      )}
      Connect {label}
    </button>
  );
};

export default WalletButton;
