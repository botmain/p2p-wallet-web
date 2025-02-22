import { Provider } from '@project-serum/anchor';
import { OpenOrders } from '@project-serum/serum';
import { TokenListContainer } from '@solana/spl-token-registry';
import { PublicKey } from '@solana/web3.js';

import { DEX_PID, USDC_PUBKEY, USDT_PUBKEY } from './constants';

// Utility class to parse the token list for markets.
export class SwapMarkets {
  constructor(private provider: Provider, private tokenList: TokenListContainer) {}

  public tokens(): PublicKey[] {
    return this.tokenList
      .getList()
      .filter((t) => {
        const isUsdxQuoted = t.extensions?.serumV3Usdt || t.extensions?.serumV3Usdc;
        return isUsdxQuoted;
      })
      .map((t) => new PublicKey(t.address));
  }

  public pairs(mint: PublicKey): PublicKey[] {
    const tokenList = this.tokenList.getList();

    const mintInfo = this.tokenList.getList().filter((t) => t.address === mint.toString())[0];
    if (mintInfo === undefined) {
      return [];
    }
    const pairs = new Set<string>();

    // Add all tokens that also have USDC quoted markets.
    if (mintInfo.extensions?.serumV3Usdc) {
      pairs.add(USDC_PUBKEY.toString());
      let iter = tokenList
        .filter((t) => t.address !== mintInfo.address && t.extensions?.serumV3Usdc)
        .map((t) => t.address);
      iter.forEach(pairs.add, pairs);
    }

    // Add all tokens that also have USDT quoted markets.
    if (mintInfo.extensions?.serumV3Usdt) {
      pairs.add(USDT_PUBKEY.toString());
      tokenList
        .filter((t) => t.address !== mintInfo.address && t.extensions?.serumV3Usdt)
        .map((t) => t.address)
        .forEach(pairs.add, pairs);
    }

    return [...pairs].map((t) => new PublicKey(t));
  }

  // Returns the `usdxMint` quoted market address *if* no open orders account
  // already exists.
  public async getMarketAddressIfNeeded(
    usdxMint: PublicKey,
    baseMint: PublicKey,
  ): Promise<PublicKey> {
    const marketAddress = this.getMarketAddress(usdxMint, baseMint);
    if (marketAddress === null) {
      throw new Error('Market not found');
    }
    let accounts = await OpenOrders.findForMarketAndOwner(
      this.provider.connection,
      marketAddress,
      this.provider.wallet.publicKey,
      DEX_PID,
    );
    if (accounts[0] !== undefined) {
      throw new Error('Open orders account already exists');
    }
    return marketAddress;
  }

  // Returns the `usdxMint` quoted market address.
  public getMarketAddress(usdxMint: PublicKey, baseMint: PublicKey): PublicKey | null {
    const market = this.tokenList
      .getList()
      .filter((t) => {
        if (t.address !== baseMint?.toString()) {
          return false;
        }
        if (usdxMint.equals(USDC_PUBKEY)) {
          return t.extensions?.serumV3Usdc !== undefined;
        } else if (usdxMint.equals(USDT_PUBKEY)) {
          return t.extensions?.serumV3Usdt !== undefined;
        } else {
          return false;
        }
      })
      .map((t) => {
        if (usdxMint!.equals(USDC_PUBKEY)) {
          return new PublicKey(t.extensions!.serumV3Usdc as string);
        } else {
          return new PublicKey(t.extensions!.serumV3Usdt as string);
        }
      })[0];
    if (market === undefined) {
      return null;
    }
    return market;
  }

  // Returns true if there's a trade across two USDC quoted markets
  // `fromMint` `toMint`.
  public usdcPathExists(fromMint: PublicKey, toMint: PublicKey): boolean {
    const fromMarket = this.tokenList
      .getList()
      .filter((t) => t.address === fromMint.toString())
      .filter((t) => t.extensions?.serumV3Usdc !== undefined)[0];
    const toMarket = this.tokenList
      .getList()
      .filter((t) => t.address === toMint.toString())
      .filter((t) => t.extensions?.serumV3Usdc !== undefined)[0];
    return fromMarket !== undefined && toMarket !== undefined;
  }

  public route(fromMint: PublicKey, toMint: PublicKey): PublicKey[] | null {
    if (fromMint.equals(USDC_PUBKEY) || fromMint.equals(USDT_PUBKEY)) {
      const market = this.getMarketAddress(fromMint, toMint);
      if (market === null) {
        return null;
      }
      return [market];
    } else if (toMint.equals(USDC_PUBKEY) || toMint.equals(USDT_PUBKEY)) {
      const market = this.getMarketAddress(toMint, fromMint);
      if (market === null) {
        return null;
      }
      return [market];
    } else {
      let fromMarket = this.getMarketAddress(USDC_PUBKEY, fromMint);
      let toMarket = this.getMarketAddress(USDC_PUBKEY, toMint);
      if (fromMarket === null || toMarket === null) {
        fromMarket = this.getMarketAddress(USDT_PUBKEY, fromMint);
        toMarket = this.getMarketAddress(USDT_PUBKEY, toMint);
        if (fromMarket === null || toMarket === null) {
          return null;
        }
      }
      return [fromMarket, toMarket];
    }
  }
}
