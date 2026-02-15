import { JsonRpcProvider, Wallet, Contract, keccak256, toUtf8Bytes } from "ethers";
import { config } from "../config";
import * as path from "path";
import * as fs from "fs";

const SHARED_DIR = path.resolve(__dirname, "../../../shared");
const REWARDS_ABI = JSON.parse(
  fs.readFileSync(path.join(SHARED_DIR, "abis/ArenaRewards.json"), "utf-8")
);
const ADDRESSES: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(SHARED_DIR, "addresses.json"), "utf-8")
);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

let provider: JsonRpcProvider | null = null;
let signer: Wallet | null = null;
let rewardsContract: Contract | null = null;

function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(config.RPC_URL);
  }
  return provider;
}

function getSigner(): Wallet {
  if (!signer) {
    signer = new Wallet(config.PRIVATE_KEY, getProvider());
  }
  return signer;
}

function getRewardsContract(): Contract {
  if (!rewardsContract) {
    const address = ADDRESSES["ArenaRewards"];
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      throw new Error("ArenaRewards address not configured in shared/addresses.json");
    }
    rewardsContract = new Contract(address, REWARDS_ABI, getSigner());
  }
  return rewardsContract;
}

/**
 * Eagerly initialize blockchain connections at startup. Fails fast if misconfigured.
 */
export async function initBlockchain(): Promise<void> {
  const p = getProvider();
  const network = await p.getNetwork();
  console.log(`Blockchain connected: chainId=${network.chainId}`);

  const s = getSigner();
  console.log(`Signer address: ${s.address}`);

  const rewards = getRewardsContract();
  const rewardsAddr = await rewards.getAddress();
  console.log(`ArenaRewards contract: ${rewardsAddr}`);
}

/**
 * Register a new game on-chain via ArenaRewards.registerGame().
 * Returns the transaction hash.
 */
export async function registerGame(gameId: string, challenger: string): Promise<string> {
  const rewards = getRewardsContract();
  const gameIdHash = keccak256(toUtf8Bytes(gameId));
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const tx = await rewards.registerGame(gameIdHash, challenger);
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `registerGame attempt ${attempt + 1}/${MAX_RETRIES} failed:`,
        lastError.message
      );

      const msg = lastError.message.toLowerCase();
      if (msg.includes("gamealreadyexists") || msg.includes("zeroaddress") || msg.includes("accesscontrol")) {
        throw lastError;
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Settle a game on-chain by calling ArenaRewards.settleGame().
 * Retries with exponential backoff on transient failures.
 * Returns the settlement transaction hash.
 */
export async function settleGame(
  gameId: string,
  score: number,
  challengerWon: boolean,
  jokeHash: string
): Promise<string> {
  const rewards = getRewardsContract();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const tx = await rewards.settleGame(gameId, score, challengerWon, jokeHash);
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `settleGame attempt ${attempt + 1}/${MAX_RETRIES} failed:`,
        lastError.message
      );

      const msg = lastError.message.toLowerCase();
      if (msg.includes("gamealreadysettled") || msg.includes("gamenotfound") || msg.includes("accesscontrol") || msg.includes("insufficientprizebalance")) {
        throw lastError;
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Get the current prize pool balance.
 */
export async function getPrizeBalance(): Promise<string> {
  const rewards = getRewardsContract();
  const balance: bigint = await rewards.prizeBalance();
  return balance.toString();
}

/**
 * Compute the keccak256 hash of a joke string, matching the on-chain jokeHash format.
 */
export function computeJokeHash(joke: string): string {
  return keccak256(toUtf8Bytes(joke));
}
