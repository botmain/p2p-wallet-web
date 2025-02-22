// TODO: maybe move in to above folder cause it is use in TokenAvatar

import { useMemo } from 'react';

import { TokenInfo, TokenListContainer } from '@solana/spl-token-registry';
import { createContainer } from 'unstated-next';

import { SOL_MINT } from '../common/constants';

// Tag in the spl-token-registry for sollet wrapped tokens.
export const SPL_REGISTRY_SOLLET_TAG = 'wrapped-sollet';

// Tag in the spl-token-registry for wormhole wrapped tokens.
export const SPL_REGISTRY_WORM_TAG = 'wormhole';

const SOL_TOKEN_INFO = {
  chainId: 101,
  address: SOL_MINT.toString(),
  name: 'Native SOL',
  decimals: 9,
  symbol: 'SOL',
  logoURI: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/solana/info/logo.png',
  tags: [],
  extensions: {
    website: 'https://solana.com/',
    serumV3Usdc: '9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT',
    serumV3Usdt: 'HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1',
    coingeckoId: 'solana',
    waterfallbot: 'https://t.me/SOLwaterfall',
  },
};

export interface UseTokenList {
  tokenMap: Map<string, TokenInfo>;
  wormholeMap: Map<string, TokenInfo>;
  solletMap: Map<string, TokenInfo>;
  swappableTokens: TokenInfo[];
  swappableTokensSollet: TokenInfo[];
  swappableTokensWormhole: TokenInfo[];
}

export interface UseTokenListArgs {
  tokenList: TokenListContainer;
}

const useTokenListInternal = (props: UseTokenListArgs): UseTokenList => {
  const tokenList = useMemo(() => {
    const list = props.tokenList.filterByClusterSlug('mainnet-beta').getList();
    // Manually add a fake SOL mint for the native token. The component is
    // opinionated in that it distinguishes between wrapped SOL and SOL.
    list.push(SOL_TOKEN_INFO);

    return list;
  }, [props.tokenList]);

  // Token map for quick lookup.
  const tokenMap = useMemo(() => {
    const tokenMap = new Map();

    tokenList.forEach((t: TokenInfo) => {
      tokenMap.set(t.address, t);
    });

    return tokenMap;
  }, [tokenList]);

  // Tokens with USD(x) quoted markets.
  const swappableTokens = useMemo(() => {
    const tokens = tokenList.filter((t: TokenInfo) => {
      const isUsdxQuoted = t.extensions?.serumV3Usdt || t.extensions?.serumV3Usdc;
      return isUsdxQuoted;
    });

    tokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0,
    );

    return tokens;
  }, [tokenList]);

  // Sollet wrapped tokens.
  const [swappableTokensSollet, solletMap] = useMemo(() => {
    const tokens = tokenList.filter((t: TokenInfo) => {
      const isSollet = t.tags?.includes(SPL_REGISTRY_SOLLET_TAG);
      return isSollet;
    });

    tokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0,
    );

    return [tokens, new Map<string, TokenInfo>(tokens.map((t: TokenInfo) => [t.address, t]))];
  }, [tokenList]);

  // Wormhole wrapped tokens.
  const [swappableTokensWormhole, wormholeMap] = useMemo(() => {
    const tokens = tokenList.filter((t: TokenInfo) => {
      const isSollet = t.tags?.includes(SPL_REGISTRY_WORM_TAG);
      return isSollet;
    });

    tokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0,
    );

    return [tokens, new Map<string, TokenInfo>(tokens.map((t: TokenInfo) => [t.address, t]))];
  }, [tokenList]);

  return {
    tokenMap,
    wormholeMap,
    solletMap,
    swappableTokens,
    swappableTokensWormhole,
    swappableTokensSollet,
  };
};

export const { Provider: TokenListProvider, useContainer: useTokenList } = createContainer<
  UseTokenList,
  UseTokenListArgs
>(useTokenListInternal);
