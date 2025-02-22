import React, { FunctionComponent } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

import { styled } from '@linaria/react';
import classNames from 'classnames';
import { rgba } from 'polished';

import { Transaction } from 'api/transaction/Transaction';
import { AmountUSD } from 'components/common/AmountUSD';
import { TokenAvatar } from 'components/common/TokenAvatar';
import { Icon } from 'components/ui';
import { openModal } from 'store/actions/modals';
import { SHOW_MODAL_TRANSACTION_DETAILS } from 'store/constants/modalTypes';
import { trackEvent } from 'utils/analytics';
import { shortAddress } from 'utils/tokens';

const Wrapper = styled.div`
  position: relative;

  padding: 10px 0;

  &:not(:last-child) {
    &::after {
      position: absolute;
      right: 10px;
      bottom: 0;
      left: 10px;

      border-bottom: 1px solid ${rgba(0, 0, 0, 0.05)};

      content: '';
    }
  }
`;

const BaseWrapper = styled.div`
  width: 48px;
  height: 48px;
  margin-right: 12px;
`;

const TransactionIconWrapper = styled(BaseWrapper)`
  display: flex;
  align-items: center;
  justify-content: center;

  background: #f6f6f8;
  border-radius: 12px;
`;

const TransactionIcon = styled(Icon)`
  width: 25px;
  height: 25px;

  color: #a3a5ba;
`;

const SwapAvatarsWrapper = styled(BaseWrapper)`
  position: relative;

  & > :nth-child(1) {
    position: absolute;
    top: 0;
    left: 0;
  }

  & > :nth-child(2) {
    position: absolute;
    right: 0;
    bottom: 0;
  }
`;

const Content = styled.div`
  flex: 1;
`;

const Top = styled.div`
  display: flex;
  justify-content: space-between;

  color: #000;
  font-weight: 600;
  font-size: 16px;
  line-height: 24px;
`;

const Type = styled.div`
  text-transform: capitalize;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
`;

const Amount = styled.div`
  &.isReceiver {
    color: #2db533;
  }
`;

const StatusWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const WarningIcon = styled(Icon)`
  width: 16px;
  height: 16px;
  margin-left: 9px;

  color: #f43d3d;
`;

const ClockIcon = styled(Icon)`
  width: 15px;
  height: 15px;
  margin-left: 9px;

  color: #ffa631;
`;

const Main = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;

  cursor: pointer;

  &:hover {
    background: #f6f6f8;
    border-radius: 12px;

    ${TransactionIconWrapper} {
      background: #fff;
    }

    ${Type} {
      color: #5887ff;
    }
  }
`;

const Bottom = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 5px;

  color: #a3a5ba;
  font-weight: 600;
  font-size: 14px;
  line-height: 16px;
`;

const LinkStyled = styled(Link)`
  color: #a3a5ba;
  text-decoration: none;
`;

type Props = {
  transaction: Transaction;
  source: string;
};

export const TransactionRow: FunctionComponent<Props> = ({ transaction, source }) => {
  const dispatch = useDispatch();
  // const publicKey = useSelector((state) => state.wallet.publicKey);
  const details = transaction.details(
    // transaction.short.destinationTokenAccount?.owner.toBase58() === publicKey ||
    transaction.short.destination?.toBase58() === source,
  );

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (['A', 'IMG'].includes((e.target as HTMLElement).tagName)) {
      return;
    }

    trackEvent('wallet_transaction_details_open');

    void dispatch(
      openModal({
        modalType: SHOW_MODAL_TRANSACTION_DETAILS,
        props: { signature: transaction.signature, source },
      }),
    );
  };

  const renderBottomLeft = () => {
    if (details.type === 'swap' && details.sourceToken && details.destinationToken) {
      return (
        <>
          <LinkStyled to={details.source && `/wallet/${details.source.toBase58()}`}>
            {details.sourceToken.symbol}
          </LinkStyled>{' '}
          to{' '}
          <LinkStyled to={details.destination && `/wallet/${details.destination.toBase58()}`}>
            {details.destinationToken.symbol}
          </LinkStyled>
        </>
      );
    }

    if (details.type === 'transfer' || details.type === 'transferChecked') {
      const address = details.destination?.toBase58();
      if (address) {
        return `To ${shortAddress(address)}`;
      }
    }

    if (details.type === 'receive') {
      const address = details.source?.toBase58();
      if (address) {
        return `From ${shortAddress(address)}`;
      }
    }

    if (details.typeOriginal === 'createAccount') {
      const symbol = details.destinationToken?.symbol;
      if (symbol) {
        return `${symbol} Created`;
      }
    }

    if (details.typeOriginal === 'closeAccount') {
      const symbol = details.sourceToken?.symbol;
      if (symbol) {
        return `${symbol} Closed`;
      }
    }

    return <div title={transaction.signature}>{shortAddress(transaction.signature)}</div>;
  };

  return (
    <Wrapper>
      <Main onClick={handleClick}>
        {details.type === 'swap' ? (
          <SwapAvatarsWrapper>
            <TokenAvatar
              symbol={details.sourceToken?.symbol}
              address={details.sourceToken?.address.toBase58()}
              size={32}
            />
            <TokenAvatar
              symbol={details.destinationToken?.symbol}
              address={details.destinationToken?.address.toBase58()}
              size={32}
            />
          </SwapAvatarsWrapper>
        ) : (
          <TransactionIconWrapper>
            {details.icon ? <TransactionIcon name={details.icon} /> : undefined}
          </TransactionIconWrapper>
        )}
        <Content>
          <Top>
            <Type>{details.type}</Type>
            <Right>
              {details.token ? (
                <Amount className={classNames({ isReceiver: details.isReceiver })}>
                  <AmountUSD
                    prefix={details.isReceiver ? '+' : '-'}
                    value={details.amount}
                    symbol={details.token.symbol}
                  />
                </Amount>
              ) : undefined}
              {transaction.meta?.err ? (
                <StatusWrapper title="Transaction failed">
                  <WarningIcon name="warning" />
                </StatusWrapper>
              ) : undefined}
              {!transaction.slot ? (
                <StatusWrapper title="Transaction processing">
                  <ClockIcon name="clock" />
                </StatusWrapper>
              ) : undefined}
            </Right>
          </Top>
          <Bottom>
            <div>{renderBottomLeft()}</div>
            <div>
              {details.typeOriginal ? (
                <>
                  {details.isReceiver ? '+' : '-'} {details.amount.toNumber()}{' '}
                  {details.token?.symbol}
                </>
              ) : (
                <>#{transaction.slot}</>
              )}
            </div>
          </Bottom>
        </Content>
      </Main>
    </Wrapper>
  );
};
