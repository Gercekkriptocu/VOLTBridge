import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Settings, ArrowDown, ExternalLink, Activity, Info, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { ChainId, Token, WalletState } from './types';
import { TOKENS, MOCK_RATES, BASE_CHAIN_ID } from './constants';
import WalletButton from './components/WalletButton';
import AIChat from './components/AIChat';
import * as ChainService from './services/chainService';

const App: React.FC = () => {
  // --- State Management ---
  
  const [baseWallet, setBaseWallet] = useState<WalletState>({ address: null, connected: false, chainId: null, balance: '0', isCorrectChain: false });
  const [solWallet, setSolWallet] = useState<WalletState>({ address: null, connected: false, chainId: ChainId.SOLANA, balance: '0', isCorrectChain: true });
  
  const [isConnectingBase, setIsConnectingBase] = useState(false);
  const [isConnectingSol, setIsConnectingSol] = useState(false);

  // Bridge Form
  const [fromChain, setFromChain] = useState<ChainId>(ChainId.BASE);
  const [amount, setAmount] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<Token>(TOKENS[ChainId.BASE][0]); 
  
  // Transaction
  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'bridging' | 'completed' | 'failed'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toChain = fromChain === ChainId.BASE ? ChainId.SOLANA : ChainId.BASE;
  const isReady = baseWallet.connected && solWallet.connected && amount && parseFloat(amount) > 0 && (fromChain === ChainId.BASE ? baseWallet.isCorrectChain : true);

  // --- Helpers ---
  const updateBalance = async (wallet: 'base' | 'solana', address: string, token: Token) => {
      try {
          if (wallet === 'base') {
              const bal = await ChainService.getBalanceEVM(address, token.address);
              setBaseWallet(prev => ({ ...prev, balance: bal }));
          } else {
              const bal = await ChainService.getBalanceSolana(address, token.address);
              setSolWallet(prev => ({ ...prev, balance: bal }));
          }
      } catch (e) {
          console.error("Failed to fetch balance", e);
      }
  };

  // --- Handlers ---

  const handleConnectBase = async () => {
    setIsConnectingBase(true);
    setErrorMsg(null);
    try {
      const { address, chainId } = await ChainService.connectEVM();
      const isCorrect = chainId === BASE_CHAIN_ID;
      
      setBaseWallet({
        address,
        connected: true,
        chainId: chainId as any, // Simple casting
        balance: '...',
        isCorrectChain: isCorrect
      });
      
      if (!isCorrect) {
          await ChainService.switchChainToBase();
          setBaseWallet(prev => ({ ...prev, isCorrectChain: true, chainId: BASE_CHAIN_ID as any }));
      }
      
      // Initial balance fetch for default token (ETH)
      await updateBalance('base', address, TOKENS[ChainId.BASE][0]);

    } catch (e: any) {
        console.error(e);
        setErrorMsg(e.message || "Failed to connect EVM wallet");
    } finally {
      setIsConnectingBase(false);
    }
  };

  const handleConnectSolana = async () => {
    setIsConnectingSol(true);
    setErrorMsg(null);
    try {
      const { address } = await ChainService.connectSolana();
      setSolWallet({
        address,
        connected: true,
        chainId: ChainId.SOLANA,
        balance: '...',
        isCorrectChain: true
      });
      
      await updateBalance('solana', address, TOKENS[ChainId.SOLANA][0]);

    } catch (e: any) {
        console.error(e);
        setErrorMsg(e.message || "Failed to connect Solana wallet");
    } finally {
      setIsConnectingSol(false);
    }
  };

  // Refresh balance when token changes
  useEffect(() => {
    if (fromChain === ChainId.BASE && baseWallet.connected && baseWallet.address) {
        updateBalance('base', baseWallet.address, selectedToken);
    } else if (fromChain === ChainId.SOLANA && solWallet.connected && solWallet.address) {
        updateBalance('solana', solWallet.address, selectedToken);
    }
  }, [selectedToken, fromChain]);


  const handleSwapChains = () => {
    setFromChain(toChain);
    // Reset token selection to default of new chain
    setSelectedToken(TOKENS[toChain][0]);
    setAmount('');
  };

  const calculateReceiveAmount = () => {
    if (!amount) return '0.00';
    const val = parseFloat(amount);
    // Use Mock Rates for estimation (Real bridges query an API like Wormhole/Mayan)
    if (selectedToken.symbol === 'USDC') return (val * MOCK_RATES.USDC_TO_USDC).toFixed(4);
    if (fromChain === ChainId.BASE && selectedToken.symbol === 'ETH') return (val * MOCK_RATES.ETH_TO_SOL).toFixed(4);
    if (fromChain === ChainId.SOLANA && selectedToken.symbol === 'SOL') return (val * MOCK_RATES.SOL_TO_ETH).toFixed(4);
    return val.toFixed(4);
  };

  const executeBridge = async () => {
    if (!isReady) return;
    setTxStatus('approving');
    setErrorMsg(null);
    
    try {
        let hash = '';
        if (fromChain === ChainId.BASE) {
             if (!baseWallet.isCorrectChain) await ChainService.switchChainToBase();
             setTxStatus('bridging');
             hash = await ChainService.sendTransactionEVM(amount, selectedToken.address);
        } else {
             setTxStatus('bridging');
             hash = await ChainService.sendTransactionSolana(amount, selectedToken.address);
        }
        
        setTxHash(hash);
        setTxStatus('completed');
    } catch (e: any) {
        console.error(e);
        setTxStatus('failed');
        setErrorMsg(e.message || "Transaction failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-white font-sans selection:bg-base-blue selection:text-white relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-base-blue/10 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-solana-purple/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Navbar */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-base-blue to-solana-purple flex items-center justify-center font-bold text-lg">V</div>
            <span className="text-xl font-bold tracking-tight">Volt<span className="text-gray-400">Bridge</span></span>
        </div>
        
        <div className="flex gap-4">
            <WalletButton 
                chainId={ChainId.BASE} 
                connected={baseWallet.connected} 
                address={baseWallet.address} 
                onConnect={handleConnectBase}
                onDisconnect={() => setBaseWallet(prev => ({...prev, connected: false, address: null}))}
                isLoading={isConnectingBase}
            />
            <WalletButton 
                chainId={ChainId.SOLANA} 
                connected={solWallet.connected} 
                address={solWallet.address} 
                onConnect={handleConnectSolana}
                onDisconnect={() => setSolWallet(prev => ({...prev, connected: false, address: null}))}
                isLoading={isConnectingSol}
            />
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-lg mx-auto mt-16 px-4">
        
        {/* Error Alert */}
        {errorMsg && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                <div className="text-sm">{errorMsg}</div>
                <button onClick={() => setErrorMsg(null)} className="ml-auto hover:text-white"><Settings size={14} /></button>
            </div>
        )}

        {/* Bridge Card */}
        <div className="bg-[#13161B] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden relative">
            
            {/* Header */}
            <div className="p-6 flex justify-between items-center border-b border-gray-800/50">
                <h1 className="text-xl font-semibold">Bridge Assets</h1>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Mainnet
                </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-2">
                
                {/* From Section */}
                <div className="bg-black/20 p-4 rounded-2xl border border-gray-800/50 hover:border-gray-700 transition-colors">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-400 font-medium">From</span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                             Balance: <span className="text-gray-300 font-mono">
                                {fromChain === ChainId.BASE ? baseWallet.balance : solWallet.balance}
                             </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-3xl font-medium focus:outline-none w-full placeholder-gray-600"
                        />
                        <div className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 transition px-3 py-1.5 rounded-full cursor-pointer shrink-0">
                            <img src={selectedToken.icon} alt={selectedToken.symbol} className="w-6 h-6 rounded-full" />
                            <span className="font-semibold">{selectedToken.symbol}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${fromChain === ChainId.BASE ? 'bg-base-blue/20 text-blue-400' : 'bg-solana-purple/20 text-purple-400'}`}>
                                {fromChain === ChainId.BASE ? 'BASE' : 'SOL'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Switcher */}
                <div className="flex justify-center -my-3 relative z-10">
                    <button 
                        onClick={handleSwapChains}
                        className="bg-[#1E232B] border border-gray-700 p-2 rounded-xl text-gray-400 hover:text-white hover:border-base-blue transition shadow-lg"
                    >
                        <ArrowDown size={20} />
                    </button>
                </div>

                {/* To Section */}
                <div className="bg-black/20 p-4 rounded-2xl border border-gray-800/50 hover:border-gray-700 transition-colors">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-400 font-medium">To (Estimated)</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                         <div className="text-3xl font-medium w-full text-gray-300">
                             {amount ? calculateReceiveAmount() : '0.00'}
                         </div>
                        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full opacity-80 shrink-0">
                             {/* Inferred Destination Token Display */}
                             <img 
                                src={
                                    selectedToken.symbol === 'USDC' ? TOKENS[toChain][1].icon : 
                                    toChain === ChainId.SOLANA ? TOKENS[toChain][0].icon : TOKENS[toChain][0].icon
                                } 
                                alt="Token" 
                                className="w-6 h-6 rounded-full" 
                            />
                            <span className="font-semibold">
                                {selectedToken.symbol === 'USDC' ? 'USDC' : toChain === ChainId.SOLANA ? 'SOL' : 'ETH'}
                            </span>
                             <span className={`text-xs px-1.5 py-0.5 rounded ${toChain === ChainId.BASE ? 'bg-base-blue/20 text-blue-400' : 'bg-solana-purple/20 text-purple-400'}`}>
                                {toChain === ChainId.BASE ? 'BASE' : 'SOL'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="pt-2 px-1 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-1">Est. Time <Info size={12} /></span>
                        <span className="text-gray-300">~ 20 mins (Finality)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Route</span>
                        <span className="text-base-blue text-xs border border-base-blue/30 px-2 py-0.5 rounded-full">Standard Gateway</span>
                    </div>
                </div>

                {/* Main Action Button */}
                <button
                    onClick={executeBridge}
                    disabled={!isReady || txStatus !== 'idle'}
                    className={`w-full mt-4 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg
                        ${isReady && txStatus === 'idle'
                            ? 'bg-gradient-to-r from-base-blue to-solana-purple text-white hover:opacity-90 hover:scale-[1.01]' 
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                    `}
                >
                    {txStatus === 'idle' && (
                        !baseWallet.connected ? 'Connect Base Wallet' : 
                        !solWallet.connected ? 'Connect Solana Wallet' : 
                        !amount ? 'Enter Amount' :
                        (fromChain === ChainId.BASE && !baseWallet.isCorrectChain) ? 'Switch to Base' :
                        'Bridge Assets'
                    )}
                    {txStatus === 'approving' && 'Check Wallet...'}
                    {txStatus === 'bridging' && 'Confirming Transaction...'}
                    {txStatus === 'completed' && 'Bridge Initiated!'}
                    {txStatus === 'failed' && 'Transaction Failed'}
                </button>
            </div>

            {/* Loading Overlay */}
            {(txStatus === 'approving' || txStatus === 'bridging') && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-gray-700 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-t-base-blue border-r-solana-purple border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <p className="mt-4 font-medium text-lg animate-pulse">
                        {txStatus === 'approving' ? 'Please sign in wallet...' : 'Broadcasting to network...'}
                    </p>
                </div>
            )}

            {/* Success Overlay */}
            {txStatus === 'completed' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 size={40} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Bridge Initiated!</h2>
                    <p className="text-gray-400 mb-6">Your transaction has been broadcast. The bridge protocol will pick it up shortly.</p>
                    
                    {txHash && (
                        <a 
                            href={fromChain === ChainId.BASE ? `https://basescan.org/tx/${txHash}` : `https://solscan.io/tx/${txHash}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-2 text-base-blue hover:text-blue-400 transition mb-6 justify-center"
                        >
                            View on Explorer <ExternalLink size={16} />
                        </a>
                    )}

                    <button 
                        onClick={() => { setTxStatus('idle'); setAmount(''); }}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-xl transition"
                    >
                        Bridge More
                    </button>
                </div>
            )}
        </div>
      </main>
      
      {/* Floating AI Assistant */}
      <AIChat />

    </div>
  );
};

export default App;