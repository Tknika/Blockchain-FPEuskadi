import { ethers } from 'ethers';
import { BESU_CONFIG, BESU_NODES } from '../../config.js';

class BesuService {
  constructor() {
    this.provider = null;
    this.isConnected = false;
    this.currentNodeId = null;
    this.currentRpcUrl = null;
  }

  // Inicializar conexión con el nodo Besu
  async connect(rpcUrl = null, nodeId = null) {
    try {
      // Si no se proporciona URL, usar el nodo guardado o el por defecto
      if (!rpcUrl) {
        const savedNodeId = localStorage.getItem('selectedNodeId') || BESU_CONFIG.defaultNodeId;
        const savedNode = BESU_NODES.find(n => n.id === savedNodeId);
        rpcUrl = savedNode?.rpcUrl || BESU_NODES[0].rpcUrl;
        nodeId = savedNodeId;
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      await this.provider.getNetwork();
      this.isConnected = true;
      this.currentRpcUrl = rpcUrl;
      this.currentNodeId = nodeId;
      
      console.log('✅ Conectado a Hyperledger Besu:', rpcUrl);
      return true;
    } catch (error) {
      console.error('❌ Error conectando a Besu:', error);
      this.isConnected = false;
      this.currentRpcUrl = null;
      this.currentNodeId = null;
      return false;
    }
  }

  // Cambiar de nodo RPC
  async switchNode(nodeId) {
    const node = BESU_NODES.find(n => n.id === nodeId);
    if (!node) {
      console.error('Nodo no encontrado:', nodeId);
      return false;
    }

    console.log('🔄 Cambiando a nodo:', node.name);
    
    // Guardar selección en localStorage
    localStorage.setItem('selectedNodeId', nodeId);
    
    // Reconectar con el nuevo nodo
    return await this.connect(node.rpcUrl, nodeId);
  }

  // Obtener información del nodo actual
  getCurrentNode() {
    return {
      nodeId: this.currentNodeId,
      rpcUrl: this.currentRpcUrl,
      isConnected: this.isConnected
    };
  }

  // Obtener el último número de bloque
  async getLatestBlockNumber() {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      console.error('Error obteniendo último bloque:', error);
      throw error;
    }
  }

  // Obtener información de un bloque específico
  async getBlock(blockNumber) {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block) return null;

      return {
        number: block.number,
        hash: block.hash,
        timestamp: block.timestamp,
        miner: block.miner,
        difficulty: block.difficulty.toString(),
        gasLimit: block.gasLimit.toString(),
        gasUsed: block.gasUsed.toString(),
        transactions: block.transactions,
        transactionCount: block.transactions.length,
        parentHash: block.parentHash,
        nonce: block.nonce,
        extraData: block.extraData,
        size: block.length || 0
      };
    } catch (error) {
      console.error(`Error obteniendo bloque ${blockNumber}:`, error);
      throw error;
    }
  }

  // Obtener múltiples bloques
  async getBlocks(count = 10) {
    try {
      const latestBlock = await this.getLatestBlockNumber();
      const blocks = [];
      
      for (let i = 0; i < count; i++) {
        const blockNumber = latestBlock - i;
        if (blockNumber >= 0) {
          const block = await this.getBlock(blockNumber);
          if (block) blocks.push(block);
        }
      }
      
      return blocks;
    } catch (error) {
      console.error('Error obteniendo bloques:', error);
      throw error;
    }
  }

  // Obtener información de una transacción
  async getTransaction(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return null;

      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        valueWei: tx.value.toString(),
        gasLimit: tx.gasLimit.toString(),
        gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : '0',
        nonce: tx.nonce,
        data: tx.data,
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash,
        chainId: tx.chainId,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        gasUsed: receipt ? receipt.gasUsed.toString() : null,
        contractAddress: receipt?.contractAddress,
        logs: receipt?.logs || []
      };
    } catch (error) {
      console.error(`Error obteniendo transacción ${txHash}:`, error);
      throw error;
    }
  }

  // Obtener balance de una dirección
  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return {
        wei: balance.toString(),
        ether: ethers.formatEther(balance)
      };
    } catch (error) {
      console.error(`Error obteniendo balance de ${address}:`, error);
      throw error;
    }
  }

  // Obtener transacciones de un bloque
  async getBlockTransactions(blockNumber) {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block || !block.transactions) return [];

      const transactions = await Promise.all(
        block.transactions.slice(0, 20).map(async (txHash) => {
          try {
            return await this.getTransaction(txHash);
          } catch (error) {
            console.error(`Error obteniendo tx ${txHash}:`, error);
            return null;
          }
        })
      );

      return transactions.filter(tx => tx !== null);
    } catch (error) {
      console.error(`Error obteniendo transacciones del bloque ${blockNumber}:`, error);
      throw error;
    }
  }

  // Obtener estadísticas de la red
  async getNetworkStats() {
    try {
      const [latestBlock, blockNumber] = await Promise.all([
        this.getBlock(await this.getLatestBlockNumber()),
        this.getLatestBlockNumber()
      ]);

      // Calcular TPS (transacciones por segundo) aproximado
      const recentBlocks = await this.getBlocks(10);
      const totalTxs = recentBlocks.reduce((sum, block) => sum + block.transactionCount, 0);
      const timeSpan = recentBlocks.length > 1 
        ? recentBlocks[0].timestamp - recentBlocks[recentBlocks.length - 1].timestamp 
        : 1;
      const tps = timeSpan > 0 ? (totalTxs / timeSpan).toFixed(2) : '0';

      return {
        latestBlock: blockNumber,
        totalTransactions: latestBlock.transactionCount,
        averageBlockTime: timeSpan / (recentBlocks.length - 1) || 0,
        tps: tps,
        difficulty: latestBlock.difficulty,
        gasLimit: latestBlock.gasLimit,
        networkName: BESU_CONFIG.networkName
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // Buscar por hash (bloque o transacción) o dirección
  async search(query) {
    try {
      query = query.trim();

      // Buscar por número de bloque
      if (/^\d+$/.test(query)) {
        const blockNumber = parseInt(query);
        const block = await this.getBlock(blockNumber);
        if (block) return { type: 'block', data: block };
      }

      // Buscar por hash de transacción (0x + 64 caracteres)
      if (/^0x[a-fA-F0-9]{64}$/.test(query)) {
        try {
          const tx = await this.getTransaction(query);
          if (tx) return { type: 'transaction', data: tx };
        } catch (error) {
          // Si no es una transacción, podría ser un hash de bloque
          const latestBlock = await this.getLatestBlockNumber();
          for (let i = 0; i <= Math.min(latestBlock, 100); i++) {
            const block = await this.getBlock(latestBlock - i);
            if (block && block.hash === query) {
              return { type: 'block', data: block };
            }
          }
        }
      }

      // Buscar por dirección (0x + 40 caracteres)
      if (/^0x[a-fA-F0-9]{40}$/.test(query)) {
        const balance = await this.getBalance(query);
        return { 
          type: 'address', 
          data: { 
            address: query, 
            balance: balance 
          } 
        };
      }

      return { type: 'not_found', data: null };
    } catch (error) {
      console.error('Error en búsqueda:', error);
      return { type: 'error', data: error.message };
    }
  }
}

// Exportar instancia singleton
export const besuService = new BesuService();
