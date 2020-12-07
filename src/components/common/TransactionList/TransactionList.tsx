import React, { FunctionComponent } from 'react';

import { styled } from '@linaria/react';
import * as web3 from '@solana/web3.js';

import { Transaction } from 'api/transaction/Transaction';

import { TransactionRow } from '../TransactionRow';

const Wrapper = styled.div`
  display: grid;
  grid-gap: 2px;

  > :first-child:not(:last-child) {
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0;
  }

  > :last-child:not(:first-child) {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  > :not(:first-child):not(:last-child) {
    border-radius: 0;
  }
`;

type Props = {
  items?: Transaction[];
};

export const TransactionList: FunctionComponent<Props> = ({ items }) => {
  if (!items) {
    return null;
  }

  return (
    <Wrapper>
      {items.map((transaction) => (
        <TransactionRow key={transaction.signature} transaction={transaction} />
      ))}
    </Wrapper>
  );
};
