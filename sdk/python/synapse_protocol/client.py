import asyncio
import logging
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
import aiohttp
import numpy as np
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct

@dataclass
class NeuralState:
    """Represents the neural state of a node"""
    weights: np.ndarray
    gradients: np.ndarray
    timestamp: int
    version: int
    signature: str

@dataclass
class ConsensusMetrics:
    """Consensus metrics for the network"""
    total_nodes: int
    active_nodes: int
    average_reputation: float
    consensus_health: float
    last_block_height: int

class SynapseClient:
    """
    Python client for Nexar AI™ Synapse Protocol
    Handles neural state synchronization and consensus participation
    """
    
    def __init__(
        self,
        api_url: str,
        private_key: str,
        contract_address: str,
        web3_provider: str = "http://localhost:8545"
    ):
        self.api_url = api_url.rstrip('/')
        self.account = Account.from_key(private_key)
        self.web3 = Web3(Web3.HTTPProvider(web3_provider))
        self.contract_address = contract_address
        self.logger = logging.getLogger("SynapseClient")
        self.session: Optional[aiohttp.ClientSession] = None
        self._neural_state: Optional[NeuralState] = None
        self._consensus_task: Optional[asyncio.Task] = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.disconnect()
        
    async def connect(self):
        """Initialize connection and start consensus participation"""
        self.session = aiohttp.ClientSession(
            headers={"X-API-Key": self.account.address}
        )
        self._consensus_task = asyncio.create_task(self._consensus_loop())
        self.logger.info("Connected to Synapse Protocol network")
        
    async def disconnect(self):
        """Cleanup and disconnect"""
        if self._consensus_task:
            self._consensus_task.cancel()
            try:
                await self._consensus_task
            except asyncio.CancelledError:
                pass
        
        if self.session:
            await self.session.close()
            
        self.logger.info("Disconnected from Synapse Protocol network")
        
    async def _consensus_loop(self):
        """Main consensus loop"""
        while True:
            try:
                # Participate in consensus rounds
                await self._participate_consensus()
                # Update local neural state
                await self._sync_neural_state()
                # Submit metrics
                await self._submit_metrics()
            except Exception as e:
                self.logger.error(f"Error in consensus loop: {e}")
            
            await asyncio.sleep(5)  # Consensus interval
            
    async def _participate_consensus(self):
        """Participate in neural state consensus"""
        if not self._neural_state:
            return
            
        # Sign current neural state
        message = self._hash_neural_state(self._neural_state)
        signature = self._sign_message(message)
        
        # Submit to consensus
        async with self.session.post(
            f"{self.api_url}/v1/consensus/propose",
            json={
                "neural_state": self._serialize_neural_state(self._neural_state),
                "signature": signature
            }
        ) as resp:
            if resp.status != 200:
                raise Exception(f"Failed to submit consensus proposal: {await resp.text()}")
                
    def _hash_neural_state(self, state: NeuralState) -> bytes:
        """Create hash of neural state"""
        # Combine weights and gradients into single array
        combined = np.concatenate([
            state.weights.flatten(),
            state.gradients.flatten()
        ])
        # Create deterministic byte representation
        state_bytes = combined.tobytes()
        # Add metadata
        metadata = f"{state.timestamp}:{state.version}".encode()
        return Web3.keccak(state_bytes + metadata)
        
    def _sign_message(self, message: bytes) -> str:
        """Sign a message with the node's private key"""
        message_hash = encode_defunct(message)
        signed = self.web3.eth.account.sign_message(
            message_hash,
            private_key=self.account.key
        )
        return signed.signature.hex()
        
    def _serialize_neural_state(self, state: NeuralState) -> Dict:
        """Serialize neural state for transmission"""
        return {
            "weights": state.weights.tolist(),
            "gradients": state.gradients.tolist(),
            "timestamp": state.timestamp,
            "version": state.version,
            "signature": state.signature
        }
        
    async def _sync_neural_state(self):
        """Sync neural state with network"""
        async with self.session.get(
            f"{self.api_url}/v1/neural_state/latest"
        ) as resp:
            if resp.status != 200:
                raise Exception(f"Failed to sync neural state: {await resp.text()}")
                
            data = await resp.json()
            self._neural_state = NeuralState(
                weights=np.array(data["weights"]),
                gradients=np.array(data["gradients"]),
                timestamp=data["timestamp"],
                version=data["version"],
                signature=data["signature"]
            )
            
    async def _submit_metrics(self):
        """Submit node metrics to network"""
        metrics = {
            "cpu_utilization": self._get_cpu_utilization(),
            "memory_usage": self._get_memory_usage(),
            "neural_compute": self._get_neural_compute(),
            "bandwidth": self._get_bandwidth_usage()
        }
        
        async with self.session.post(
            f"{self.api_url}/v1/metrics",
            json=metrics
        ) as resp:
            if resp.status != 200:
                self.logger.warning(f"Failed to submit metrics: {await resp.text()}")
                
    def _get_cpu_utilization(self) -> float:
        """Get CPU utilization metrics"""
        # Implementation would use psutil or similar
        return 0.0
        
    def _get_memory_usage(self) -> float:
        """Get memory usage metrics"""
        # Implementation would use psutil or similar
        return 0.0
        
    def _get_neural_compute(self) -> float:
        """Get neural computation metrics"""
        # Implementation would track FLOPS or similar
        return 0.0
        
    def _get_bandwidth_usage(self) -> float:
        """Get bandwidth usage metrics"""
        # Implementation would track network I/O
        return 0.0
        
    async def get_consensus_metrics(self) -> ConsensusMetrics:
        """Get current consensus metrics"""
        async with self.session.get(
            f"{self.api_url}/v1/consensus/metrics"
        ) as resp:
            if resp.status != 200:
                raise Exception(f"Failed to get metrics: {await resp.text()}")
                
            data = await resp.json()
            return ConsensusMetrics(
                total_nodes=data["total_nodes"],
                active_nodes=data["active_nodes"],
                average_reputation=data["average_reputation"],
                consensus_health=data["consensus_health"],
                last_block_height=data["last_block_height"]
            )
            
    async def submit_gradient_update(
        self,
        gradients: np.ndarray,
        weights: Optional[np.ndarray] = None
    ):
        """Submit gradient update to network"""
        if weights is None and self._neural_state:
            weights = self._neural_state.weights
        elif weights is None:
            raise ValueError("No weights available for update")
            
        state = NeuralState(
            weights=weights,
            gradients=gradients,
            timestamp=int(time.time()),
            version=self._neural_state.version + 1 if self._neural_state else 0,
            signature=""  # Will be set below
        )
        
        # Sign the state
        message = self._hash_neural_state(state)
        state.signature = self._sign_message(message)
        
        # Submit update
        async with self.session.post(
            f"{self.api_url}/v1/neural_state/update",
            json=self._serialize_neural_state(state)
        ) as resp:
            if resp.status != 200:
                raise Exception(f"Failed to submit update: {await resp.text()}")
                
            self._neural_state = state
            
    async def get_network_topology(self) -> Dict:
        """Get current network topology"""
        async with self.session.get(
            f"{self.api_url}/v1/network/topology"
        ) as resp:
            if resp.status != 200:
                raise Exception(f"Failed to get topology: {await resp.text()}")
            return await resp.json()
            
    async def get_node_reputation(self, node_address: str) -> float:
        """Get reputation score for a node"""
        async with self.session.get(
            f"{self.api_url}/v1/nodes/{node_address}/reputation"
        ) as resp:
            if resp.status != 200:
                raise Exception(f"Failed to get reputation: {await resp.text()}")
            data = await resp.json()
            return data["reputation"] 