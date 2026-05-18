export type AbiInput = {
  name: string;
  type: string;
  internalType?: string;
  components?: AbiInput[];
};

export type AbiItem = {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: AbiInput[];
  outputs?: AbiInput[];
};

export type CompiledContract = {
  id: string;
  sourceName: string;
  contractName: string;
  abi: AbiItem[];
  bytecode: string;
  deployable: boolean;
  recommended: boolean;
  callableFunctionCount: number;
};

export type CompileResponse = {
  compilerVersion: string;
  evmVersion: string;
  warnings: string[];
  contracts: CompiledContract[];
};

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (eventName: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (eventName: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}
