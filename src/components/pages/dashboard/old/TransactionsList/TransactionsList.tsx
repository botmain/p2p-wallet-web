import React, { FunctionComponent, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { styled } from 'linaria/react';
import { path } from 'ramda';

import { getMyConfirmedSignaturesForAddress } from 'store/actions/solana';
import { ApiSolanaService } from 'store/middlewares/solana-api/services';
import { RootState } from 'store/types';

import { TransactionRow } from './TransactionRow';

const Wrapper = styled.div`
  position: relative;

  display: table;
  padding-bottom: 5px;

  white-space: nowrap;
`;

const Head = styled.div`
  display: table-row;
`;

const Column = styled.div`
  display: table-cell;

  &:not(:last-child) {
    padding-right: 24px;
  }
`;

export const TransactionsList: FunctionComponent = () => {
  const dispatch = useDispatch();
  const publicKey = useSelector((state: RootState) => state.data.blockchain.account?.publicKey);
  const order = useSelector((state: RootState) =>
    path<string[]>(['order'], state.entities.transactions[publicKey.toBase58()]),
  );

  useEffect(() => {
    dispatch(getMyConfirmedSignaturesForAddress());
  }, [ApiSolanaService.getConnection()]);

  return (
    <Wrapper>
      <Head>
        <Column>TRX HASH</Column>
        <Column>Block</Column>
        <Column>From</Column>
        <Column>To</Column>
        <Column>Value</Column>
      </Head>
      {order && order.map((signature) => <TransactionRow key={signature} signature={signature} />)}
    </Wrapper>
  );
};
