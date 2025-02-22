import React, {
  createContext,
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSelector } from 'react-redux';

import { Bitcoin } from '@renproject/chains-bitcoin';
import { Solana } from '@renproject/chains-solana';
import { getRenNetworkDetails } from '@renproject/interfaces';
import RenJS from '@renproject/ren';
import {
  DepositStates,
  GatewaySession,
  GatewayTransaction,
  isAccepted,
  OpenedGatewaySession,
} from '@renproject/ren-tx';
import { isNil } from 'ramda';

import { getWallet } from 'api/wallet';
import { NotifyToast } from 'components/common/NotifyToast';
import { ToastManager } from 'components/common/ToastManager';
import { Button } from 'components/ui';
import { useLockAndMint } from 'utils/hooks/renBridge/useLockAndMint';
import { DepositTranstaction, formatAmount } from 'utils/hooks/renBridge/useLockAndMint';
import { useRenNetwork } from 'utils/hooks/renBridge/useNetwork';
import { initConfig, loadAndDeleteExpired, MintConfig } from 'utils/lockAndMintConfig';
import { useSolanaProvider } from 'utils/providers/SolnaProvider';

export type DepositState = {
  currentState: DepositStates;
  mint: () => void;
  deposit: DepositTranstaction;
};

type Deposits = {
  [key: string]: DepositState;
};

type LockAndMintContext = {
  isConfigInitialized: boolean;
  initializeConfig: () => void;
  gatewayAddress: string;
  expiryTime: number;
  fee: number;
  deposits: Deposits;
};

const Context = createContext<null | LockAndMintContext>(null);

const showDepositToast = (sourceTxConfs: number, sourceTxConfTarget: number) => {
  const isCompleted = sourceTxConfs !== sourceTxConfTarget;
  const header = isCompleted
    ? 'Waiting for deposit confirmation...'
    : 'The deposit has been confirmed!';
  const status = isCompleted ? 'confirmingDeposit' : 'confirmedDeposit';
  ToastManager.show(({ onClose }) => (
    <NotifyToast
      type="confirmingDeposit"
      onClose={onClose}
      header={header}
      status={status}
      text={`${sourceTxConfs} / ${sourceTxConfTarget}`}
    />
  ));
};

const DepositWatcher: FC<{
  deposit: DepositTranstaction;
  machine: any;
  targetConfirmationsCount: number;
  onDepositChage: (depositId: string, deposit: DepositState) => void;
}> = ({ deposit, machine, targetConfirmationsCount, onDepositChage }) => {
  const rawAmount = useMemo(() => {
    return formatAmount(deposit.rawSourceTx.amount);
  }, [deposit.rawSourceTx.amount]);

  const { send, depositId } = useMemo(() => {
    return {
      depositId: machine.id,
      send: machine.send,
    };
  }, [machine.id, machine.send]);

  const mint = useCallback(() => {
    if (!isAccepted(deposit)) return;
    send({ type: 'CLAIM', data: deposit, params: {} });
  }, [deposit, send]);

  const { value } = machine.state;

  useEffect(() => {
    onDepositChage(depositId, { currentState: value, mint, deposit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositId, mint, value, deposit]);

  useEffect(() => {
    if (
      value === DepositStates.RENVM_ACCEPTED &&
      window.location.pathname !== '/receive' &&
      deposit.renSignature
    ) {
      ToastManager.show(({ onClose }) => (
        <NotifyToast
          type="mint"
          onClose={onClose}
          header={'Awaiting the signature on your wallet'}
          status="warning"
          button={
            <Button
              primary
              onClick={() => {
                mint();
                if (onClose) {
                  onClose();
                }
              }}>{`Mint ${rawAmount} BTC`}</Button>
          }
        />
      ));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deposit.renSignature, value]);

  useEffect(() => {
    if (value === DepositStates.CONFIRMING_DEPOSIT) {
      showDepositToast(deposit.sourceTxConfs || 0, targetConfirmationsCount);
    }
  }, [deposit.sourceTxConfs, targetConfirmationsCount, value]);

  return null;
};

const getActiveDepositId = (tx: GatewaySession<any>) => {
  if (isNil(tx.transactions)) return undefined;
  const transactions = Object.values(tx.transactions);
  const activeTransactions = transactions
    .filter((t: any) => !t?.completedAt)
    .sort(
      (a: GatewayTransaction<any>, b: GatewayTransaction<any>) =>
        Number(a.detectedAt || 0) - Number(b.detectedAt || 0),
    );
  return activeTransactions.length > 0 ? activeTransactions[0].sourceTxHash : undefined;
};

const LockAndMintSession: FC<{
  nonce: string;
  onGatewayAddressInit: (address: string) => void;
  onFeeChange: (fee: number) => void;
  onDepositChage: (depositId: string, deposit: DepositState) => void;
}> = ({ nonce, onGatewayAddressInit, onFeeChange, onDepositChage }) => {
  const solanaProvider = useSolanaProvider();
  const network = useRenNetwork();
  const lockAndMintParams = useMemo(() => {
    return {
      sdk: new RenJS(network),
      mintParams: {
        sourceAsset: Bitcoin.asset,
        network,
        destAddress: getWallet().pubkey.toBase58(),
        nonce: nonce,
      },
      from: new Bitcoin(),
      to: new Solana(solanaProvider, network),
    };
  }, [network, nonce, solanaProvider]);

  const mint = useLockAndMint(lockAndMintParams);
  useEffect(() => {
    const mount = async () => {
      const fees = await lockAndMintParams.sdk.getFees({
        asset: Bitcoin.asset,
        from: lockAndMintParams.from,
        to: lockAndMintParams.to,
      });
      onFeeChange(fees.lock ? fees.lock.toNumber() : 0);
    };

    mount();
  }, [lockAndMintParams.from, lockAndMintParams.sdk, lockAndMintParams.to, onFeeChange]);

  useEffect(() => {
    onGatewayAddressInit((mint.session as OpenedGatewaySession<any>).gatewayAddress);
  }, [mint.session, onGatewayAddressInit]);

  const targetConfirmationsCount = useMemo(() => {
    return getRenNetworkDetails(network).isTestnet ? 1 : 6;
  }, [network]);

  const current = mint.currentState;
  const activeDepositId = getActiveDepositId(current.context.tx);

  const activeDeposit = useMemo(() => {
    if (!current.context.tx.transactions || activeDepositId === undefined) {
      return null;
    }
    const deposit = current.context.tx.transactions[activeDepositId];
    if (!deposit || !current.context.depositMachines) return null;
    const machine = current.context.depositMachines[deposit.sourceTxHash];
    return { deposit, machine } as any;
  }, [activeDepositId, current.context]);

  if (activeDeposit) {
    return (
      <DepositWatcher
        deposit={activeDeposit.deposit}
        machine={activeDeposit.machine}
        targetConfirmationsCount={targetConfirmationsCount}
        onDepositChage={onDepositChage}
      />
    );
  }

  return null;
};

export const LockAndMintProvider: FC = ({ children }) => {
  const publicKey = useSelector((state) => state.wallet.publicKey);
  const [config, setConfig] = useState<MintConfig | null>(null);
  const [gatewayAddress, setGatewayAddress] = useState<string>('');
  const [fee, setFee] = useState<number>(0);
  const [deposits, setDeposits] = useState<Deposits>({});

  useEffect(() => {
    if (!publicKey) {
      return;
    }

    setConfig(loadAndDeleteExpired(publicKey));
  }, [publicKey]);

  const initializeConfig = useCallback(() => {
    if (!publicKey) {
      return;
    }
    setTimeout(() => {
      setConfig(initConfig(publicKey));
    }, 0);
  }, [publicKey]);

  const handleGatewayAddressInit = useCallback((address: string) => {
    if (address) {
      setGatewayAddress(address);
    }
  }, []);

  const handleFee = useCallback((fee: number) => {
    if (fee) {
      setFee(fee);
    }
  }, []);

  const handleDepositsChange = (depositId: string, deposit: DepositState) => {
    setDeposits({
      ...deposits,
      [depositId]: deposit,
    });
  };

  useEffect(() => {
    for (const depositId of Object.keys(deposits)) {
      if (deposits[depositId].currentState === DepositStates.COMPLETED) {
        const newDeposits = { ...deposits };
        delete newDeposits[depositId];
        setTimeout(() => {
          setDeposits({
            ...newDeposits,
          });
        }, 3000);
      }
    }
  }, [deposits]);

  const expiryTime = config ? config.expiryTime : 0;

  const content = useMemo(() => children, [children]);
  return (
    <>
      {publicKey && config ? (
        <LockAndMintSession
          nonce={config.nonce}
          onGatewayAddressInit={handleGatewayAddressInit}
          onFeeChange={handleFee}
          onDepositChage={handleDepositsChange}
        />
      ) : undefined}
      <Context.Provider
        value={{
          isConfigInitialized: !!config,
          initializeConfig,
          gatewayAddress,
          fee,
          expiryTime,
          deposits,
        }}>
        {content}
      </Context.Provider>
    </>
  );
};

export const useLockAndMintProvider = (): LockAndMintContext => {
  const ctx = useContext(Context);
  if (ctx === null) {
    throw new Error('Context not available');
  }
  return ctx;
};
