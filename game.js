document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded, initializing game...");

    let account = null;
    let contract = null;
    let animationFrameId = null;
    const TARGET_NETWORK_ID = "97"; // BNB Chain Testnet
    let WITHDRAWAL_FEE_BNB = "0.0002";
    let isGameRunning = false;

    let playerData = JSON.parse(localStorage.getItem("playerData")) || {
        gamesPlayed: 0,
        totalRewards: 0,
        boxesEaten: 0,
        pendingRewards: 0,
        totalReferrals: 0,
        referralRewards: 0,
        pendingReferral: null,
        pendingReferrerReward: 0,
        rewardHistory: [],
        hasClaimedWelcomeBonus: false,
        walletBalance: 0,
        walletAddress: null,
        flexibleStakeBalance: 0,
        lockedStakeBalances: { 0: 0, 1: 0, 2: 0, 3: 0 },
        lockedStakeStartTimes: { 0: 0, 1: 0, 2: 0, 3: 0 }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const referrerAddress = urlParams.get("ref");
    if (referrerAddress && !playerData.pendingReferral && ethers.isAddress(referrerAddress)) {
        playerData.pendingReferral = referrerAddress;
    }

    const CONTRACT_ADDRESS = "0xA8786e30e162349Df6e09D31aa3F8de1D2bb1745";
    const GAME_ORACLE_ADDRESS = "0x6C12d2802cCF7072e9ED33b3bdBB0ce4230d5032"; // यहाँ सही गेम ओरेकल एड्रेस डालें
    const CONTRACT_ABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "allowance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "needed",
				"type": "uint256"
			}
		],
		"name": "ERC20InsufficientAllowance",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "balance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "needed",
				"type": "uint256"
			}
		],
		"name": "ERC20InsufficientBalance",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "approver",
				"type": "address"
			}
		],
		"name": "ERC20InvalidApprover",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "receiver",
				"type": "address"
			}
		],
		"name": "ERC20InvalidReceiver",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			}
		],
		"name": "ERC20InvalidSender",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			}
		],
		"name": "ERC20InvalidSpender",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Approval",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "oldOracle",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOracle",
				"type": "address"
			}
		],
		"name": "GameOracleUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "enum BlockSnakesGame.LockPeriod",
				"name": "period",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newRate",
				"type": "uint256"
			}
		],
		"name": "LockRewardUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newLimit",
				"type": "uint256"
			}
		],
		"name": "MaxWithdrawalLimitUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "oldWallet",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newWallet",
				"type": "address"
			}
		],
		"name": "OwnerWalletUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "referrer",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "referee",
				"type": "address"
			}
		],
		"name": "ReferralAdded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newRate",
				"type": "uint256"
			}
		],
		"name": "ReferralCommissionRateUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalReward",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "referrer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "referrerReward",
				"type": "uint256"
			}
		],
		"name": "RewardsClaimed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "SecretKeyUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "TokensBurned",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "ownerAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "contractAmount",
				"type": "uint256"
			}
		],
		"name": "TokensMinted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "enum BlockSnakesGame.LockPeriod",
				"name": "lockPeriod",
				"type": "uint8"
			}
		],
		"name": "TokensStaked",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "enum BlockSnakesGame.LockPeriod",
				"name": "lockPeriod",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "reward",
				"type": "uint256"
			}
		],
		"name": "TokensUnstaked",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "fee",
				"type": "uint256"
			}
		],
		"name": "TokensWithdrawn",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Transfer",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "WelcomeBonusClaimed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newBonus",
				"type": "uint256"
			}
		],
		"name": "WelcomeBonusUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newFeeInBnbWei",
				"type": "uint256"
			}
		],
		"name": "WithdrawalFeeUpdated",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "approve",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_key",
				"type": "string"
			}
		],
		"name": "burnTokens",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "totalReward",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "referrer",
				"type": "address"
			}
		],
		"name": "claimAllRewards",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "claimWelcomeBonus",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_key",
				"type": "string"
			}
		],
		"name": "mintTokens",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "enum BlockSnakesGame.LockPeriod",
				"name": "lockPeriod",
				"type": "uint8"
			}
		],
		"name": "stakeTokens",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "transfer",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "transferFrom",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_gameOracle",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "enum BlockSnakesGame.LockPeriod",
				"name": "lockPeriod",
				"type": "uint8"
			}
		],
		"name": "unstakeTokens",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_newOracle",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "_key",
				"type": "string"
			}
		],
		"name": "updateGameOracle",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "enum BlockSnakesGame.LockPeriod",
				"name": "period",
				"type": "uint8"
			},
			{
				"internalType": "uint256",
				"name": "_newRate",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_key",
				"type": "string"
			}
		],
		"name": "updateLockReward",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_newLimit",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_key",
				"type": "string"
			}
		],
		"name": "updateMaxWithdrawalLimit",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_newWallet",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "_key",
				"type": "string"
			}
		],
		"name": "updateOwnerWallet",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_newRate",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_key",
				"type": "string"
			}
		],
		"name": "updateReferralCommissionRate",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_newKey",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "_currentKey",
				"type": "string"
			}
		],
		"name": "updateSecretKey",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_newBonus",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_key",
				"type": "string"
			}
		],
		"name": "updateWelcomeBonus",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_newFeeInBnbWei",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_key",
				"type": "string"
			}
		],
		"name": "updateWithdrawalFee",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "withdrawTokens",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			}
		],
		"name": "allowance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "balanceOf",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "contractBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "decimals",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "gameOracle",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			}
		],
		"name": "getInternalBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"internalType": "enum BlockSnakesGame.LockPeriod",
				"name": "lockPeriod",
				"type": "uint8"
			}
		],
		"name": "getLockedStakeBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"internalType": "enum BlockSnakesGame.LockPeriod",
				"name": "lockPeriod",
				"type": "uint8"
			}
		],
		"name": "getLockedStakeStartTime",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			}
		],
		"name": "getRewardHistory",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "timestamp",
						"type": "uint256"
					},
					{
						"internalType": "string",
						"name": "rewardType",
						"type": "string"
					},
					{
						"internalType": "address",
						"name": "referee",
						"type": "address"
					}
				],
				"internalType": "struct BlockSnakesGame.Reward[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "enum BlockSnakesGame.LockPeriod",
				"name": "",
				"type": "uint8"
			}
		],
		"name": "lockPeriods",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "enum BlockSnakesGame.LockPeriod",
				"name": "",
				"type": "uint8"
			}
		],
		"name": "lockRewards",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "maxWithdrawalLimit",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MINIMUM_WITHDRAWAL",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "ownerWallet",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "playerHistory",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "gamesPlayed",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalRewards",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalReferrals",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "referralRewards",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "hasClaimedWelcomeBonus",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "internalBalance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "flexibleStakeBalance",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "referralCommissionRate",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "referrals",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "rewardHistory",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "rewardType",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "referee",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "SECONDS_PER_YEAR",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalSupply",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "welcomeBonus",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "withdrawalFeeInBnb",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

    let gameOracleProvider;
    try {
        gameOracleProvider = new ethers.JsonRpcProvider("https://data-seed-prebsc-1-s1.bnbchain.org:8545/", { chainId: 97, name: "BNB Testnet" });
        console.log("Connected to JSON-RPC provider.");
    } catch (error) {
        console.error("Failed to connect to primary provider:", error);
        try {
            gameOracleProvider = new ethers.JsonRpcProvider("https://data-seed-prebsc-2-s1.bnbchain.org:8545/", { chainId: 97, name: "BNB Testnet" });
            console.log("Connected to backup JSON-RPC provider.");
        } catch (backupError) {
            console.error("Failed to connect to backup provider:", backupError);
            alert("Cannot connect to BNB Testnet. Please check your network.");
        }
    }

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas ? canvas.getContext("2d") : null;
    const gridWidth = 30;
    const gridHeight = 20;
    let gridSize;
    let snake = [{ x: 10, y: 10 }];
    let boxes = [];
    let direction = "right";
    let boxesEaten = 0;
    let gameRewards = 0;
    const baseSnakeSpeed = 150;
    let lastMoveTime = 0;

    const eatingSound = document.getElementById("eatingSound");
    const gameOverSound = document.getElementById("gameOverSound");
    const victorySound = document.getElementById("victorySound");

    function showLoading(show) {
        document.getElementById("loadingIndicator").style.display = show ? "block" : "none";
    }

    function updateCanvasSize() {
        if (!canvas) return console.error("Canvas not available!");
        const screenWidth = window.innerWidth * 0.9;
        const screenHeight = window.innerHeight * 0.7;
        gridSize = Math.min(screenWidth / gridWidth, screenHeight / gridHeight);
        canvas.width = gridSize * gridWidth;
        canvas.height = gridSize * gridHeight;
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
        draw();
    }

    function enterFullscreen() {
        if (document.fullscreenEnabled && canvas) {
            canvas.requestFullscreen().catch(err => console.warn("Fullscreen failed:", err));
        }
        updateCanvasSize();
    }

    function generateBoxes() {
        boxes = [];
        const numBoxes = 10;
        for (let i = 0; i < numBoxes; i++) {
            let newBox;
            do {
                newBox = { x: Math.floor(Math.random() * gridWidth), y: Math.floor(Math.random() * gridHeight) };
            } while (snake.some(segment => segment.x === newBox.x && segment.y === newBox.y) || boxes.some(b => b.x === newBox.x && b.y === newBox.y));
            boxes.push(newBox);
        }
    }

    function draw() {
        if (!ctx) return console.error("Canvas context not available!");
        ctx.fillStyle = "#0a0a23";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        snake.forEach((segment, index) => {
            ctx.fillStyle = index === 0 ? "#ffd700" : "#800080";
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);

            if (index === 0) {
                ctx.beginPath();
                ctx.arc(segment.x * gridSize + gridSize * 0.25, segment.y * gridSize + gridSize * 0.3, gridSize * 0.1, 0, Math.PI * 2);
                ctx.fillStyle = "white";
                ctx.fill();
                ctx.beginPath();
                ctx.arc(segment.x * gridSize + gridSize * 0.25, segment.y * gridSize + gridSize * 0.3, gridSize * 0.05, 0, Math.PI * 2);
                ctx.fillStyle = "black";
                ctx.fill();

                ctx.beginPath();
                ctx.arc(segment.x * gridSize + gridSize * 0.75, segment.y * gridSize + gridSize * 0.3, gridSize * 0.1, 0, Math.PI * 2);
                ctx.fillStyle = "white";
                ctx.fill();
                ctx.beginPath();
                ctx.arc(segment.x * gridSize + gridSize * 0.75, segment.y * gridSize + gridSize * 0.3, gridSize * 0.05, 0, Math.PI * 2);
                ctx.fillStyle = "black";
                ctx.fill();
            }
        });

        boxes.forEach(box => {
            ctx.fillStyle = "#ff5555";
            ctx.fillRect(box.x * gridSize, box.y * gridSize, gridSize - 2, gridSize - 2);
        });

        document.getElementById("boxesEaten").textContent = `Boxes Eaten: ${boxesEaten}`;
        document.getElementById("pendingRewards").textContent = `Pending Rewards: ${(playerData.pendingRewards || 0).toFixed(2)} BST`;
    }

    function gameLoop(currentTime) {
        if (isGameRunning && ctx) {
            if (currentTime - lastMoveTime >= baseSnakeSpeed) {
                move();
                lastMoveTime = currentTime;
            }
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    }

    function move() {
        if (!isGameRunning || !ctx) return;

        let head = { x: snake[0].x, y: snake[0].y };
        if (direction === "right") head.x++;
        if (direction === "left") head.x--;
        if (direction === "up") head.y--;
        if (direction === "down") head.y++;

        if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight) {
            gameOverSound.play();
            showGameOverPopup();
            return;
        }

        snake.unshift(head);
        const eatenBoxIndex = boxes.findIndex(box => box.x === head.x && box.y === head.y);
        if (eatenBoxIndex !== -1) {
            eatingSound.play();
            boxesEaten++;
            const reward = 0.5;
            playerData.pendingRewards = (playerData.pendingRewards || 0) + reward;
            gameRewards += reward;
            playerData.totalRewards = (playerData.totalRewards || 0) + reward;
            playerData.rewardHistory.push({ amount: reward, timestamp: Date.now(), rewardType: "Game", referee: "N/A" });
            if (playerData.pendingReferral) {
                const referrerReward = reward * 0.01;
                playerData.pendingReferrerReward = (playerData.pendingReferrerReward || 0) + referrerReward;
                playerData.referralRewards = (playerData.referralRewards || 0) + referrerReward;
                playerData.totalReferrals = (playerData.totalReferrals || 0) + 1;
                playerData.rewardHistory.push({ amount: referrerReward, timestamp: Date.now(), rewardType: "Referral", referee: playerData.pendingReferral });
            }
            boxes.splice(eatenBoxIndex, 1);
            if (boxes.length < 5) generateBoxes();
            if (boxesEaten % 10 === 0 || boxesEaten % 20 === 0 || boxesEaten % 30 === 0) victorySound.play();
        } else {
            snake.pop();
        }
        draw();
        updatePlayerHistoryUI();
        localStorage.setItem("playerData", JSON.stringify(playerData));
    }

    function showGameOverPopup() {
        const popup = document.getElementById("gameOverPopup");
        if (!popup) return;
        document.getElementById("finalBoxesEaten").textContent = `Boxes Eaten: ${boxesEaten}`;
        document.getElementById("finalRewards").textContent = `Earned BST: ${gameRewards.toFixed(2)} BST`;
        popup.style.display = "block";
        isGameRunning = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        document.getElementById("closePopup").onclick = () => {
            popup.style.display = "none";
        };
    }

    async function resetGame() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        isGameRunning = false;
        console.log("Resetting game...");
        showLoading(true);

        if (gameRewards > 0 && account && contract) {
            try {
                await submitGameReward(gameRewards);
                await loadPlayerHistory();
            } catch (error) {
                console.error("Error submitting rewards during reset:", error);
                document.getElementById("withdrawalStatus").textContent = `Error: ${error.message}`;
            }
        }

        playerData.gamesPlayed = (playerData.gamesPlayed || 0) + 1;
        boxesEaten = 0;
        gameRewards = 0;
        snake = [{ x: 10, y: 10 }];
        direction = "right";
        generateBoxes();
        updateCanvasSize();
        draw();
        showLoading(false);
        updatePlayerHistoryUI();
        localStorage.setItem("playerData", JSON.stringify(playerData));
    }

    async function submitGameReward(rewardAmount) {
        if (!account || !contract) return;
        try {
            showLoading(true);
            const tx = await contract.claimAllRewards(
                ethers.parseUnits(rewardAmount.toString(), 18),
                account,
                playerData.pendingReferral || ethers.ZeroAddress
            );
            await tx.wait();
            playerData.totalRewards = (playerData.totalRewards || 0) + rewardAmount;
            playerData.pendingRewards = (playerData.pendingRewards || 0) + rewardAmount;
            playerData.pendingReferral = null;
            gameRewards = 0;
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`${rewardAmount} BST rewards submitted!`);
        } catch (error) {
            console.error("Error submitting rewards:", error);
            document.getElementById("withdrawalStatus").textContent = `Error: ${error.message}`;
            alert("Failed to submit rewards: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function claimPendingRewards() {
        if (!account || !contract) return alert("Connect wallet first!");
        try {
            showLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum, "any");
            const signer = await provider.getSigner();
            const balance = await provider.getBalance(account);
            const feeInWei = ethers.parseUnits(WITHDRAWAL_FEE_BNB, "ether");
            if (balance < feeInWei) {
                alert(`Need ${WITHDRAWAL_FEE_BNB} BNB for fee.`);
                return;
            }
            const internalBalance = await contract.getInternalBalance(account);
            const pendingRewardsInWei = ethers.parseUnits(playerData.pendingRewards.toString(), 18);
            if (ethers.toBigInt(internalBalance) < pendingRewardsInWei) {
                alert("Insufficient internal balance. Submit rewards first.");
                return;
            }
            const tx = await contract.withdrawTokens(pendingRewardsInWei, { value: feeInWei, gasLimit: 500000 });
            await tx.wait();
            playerData.walletBalance = Number(ethers.formatUnits(await provider.getBalance(account), 18));
            playerData.pendingRewards = 0;
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert("Rewards withdrawn!");
        } catch (error) {
            console.error("Error claiming rewards:", error);
            document.getElementById("withdrawalStatus").textContent = `Error: ${error.message}`;
            alert("Failed to claim rewards: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function claimWelcomeBonus() {
        if (!account || !contract) return alert("Connect wallet first!");
        if (playerData.hasClaimedWelcomeBonus) return alert("Bonus already claimed!");
        try {
            showLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum, "any");
            const signer = await provider.getSigner();
            const balance = await provider.getBalance(account);
            const feeInWei = ethers.parseUnits(WITHDRAWAL_FEE_BNB, "ether");
            if (balance < feeInWei) {
                alert(`Need ${WITHDRAWAL_FEE_BNB} BNB for fee.`);
                return;
            }
            const tx = await contract.claimWelcomeBonus({ value: feeInWei, gasLimit: 500000 });
            await tx.wait();
            playerData.hasClaimedWelcomeBonus = true;
            const welcomeBonus = Number(ethers.formatUnits(await contract.welcomeBonus(), 18));
            playerData.totalRewards = (playerData.totalRewards || 0) + welcomeBonus;
            playerData.pendingRewards = (playerData.pendingRewards || 0) + welcomeBonus;
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`Welcome bonus of ${welcomeBonus} BST claimed!`);
        } catch (error) {
            console.error("Error claiming welcome bonus:", error);
            alert("Failed to claim bonus: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function stakeTokens() {
        if (!account || !contract) return alert("Connect wallet first!");
        const amount = parseFloat(document.getElementById("stakeAmount").value) || 0;
        const lockPeriod = parseInt(document.getElementById("lockPeriod").value);
        if (amount <= 0) return alert("Enter a valid amount!");
        try {
            showLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum, "any");
            const signer = await provider.getSigner();
            const internalBalance = await contract.getInternalBalance(account);
            const amountInWei = ethers.parseUnits(amount.toString(), 18);
            if (ethers.toBigInt(internalBalance) < amountInWei) {
                alert("Insufficient internal balance to stake!");
                return;
            }
            const contractBal = await contract.contractBalance();
            if (ethers.toBigInt(contractBal) < amountInWei) {
                alert("Contract does not have enough BST tokens!");
                return;
            }
            const tx = await contract.stakeTokens(amountInWei, lockPeriod, { gasLimit: 500000 });
            await tx.wait();
            playerData.pendingRewards = (playerData.pendingRewards || 0) - amount;
            if (lockPeriod === 0) {
                playerData.flexibleStakeBalance = (playerData.flexibleStakeBalance || 0) + amount;
            } else {
                playerData.lockedStakeBalances[lockPeriod] = (playerData.lockedStakeBalances[lockPeriod] || 0) + amount;
                playerData.lockedStakeStartTimes[lockPeriod] = Date.now() / 1000;
            }
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`${amount} BST staked successfully!`);
            document.getElementById("stakeAmount").value = "";
        } catch (error) {
            console.error("Error staking tokens:", error);
            alert("Failed to stake: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function unstakeTokens() {
        if (!account || !contract) return alert("Connect wallet first!");
        const amount = parseFloat(document.getElementById("unstakeAmount").value) || 0;
        const lockPeriod = parseInt(document.getElementById("unlockPeriod").value);
        if (amount <= 0) return alert("Enter a valid amount!");
        try {
            showLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum, "any");
            const signer = await provider.getSigner();
            const tx = await contract.unstakeTokens(ethers.parseUnits(amount.toString(), 18), lockPeriod, { gasLimit: 500000 });
            await tx.wait();
            if (lockPeriod === 0) {
                playerData.flexibleStakeBalance = (playerData.flexibleStakeBalance || 0) - amount;
            } else {
                playerData.lockedStakeBalances[lockPeriod] = (playerData.lockedStakeBalances[lockPeriod] || 0) - amount;
            }
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`${amount} BST unstaked successfully!`);
            document.getElementById("unstakeAmount").value = "";
        } catch (error) {
            console.error("Error unstaking tokens:", error);
            alert("Failed to unstake: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function connectWallet() {
        if (!window.ethereum) return alert("Install MetaMask!");
        try {
            showLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum, "any");
            await provider.send("eth_requestAccounts", []);
            const network = await provider.getNetwork();
            const chainId = network.chainId.toString();
            if (chainId !== TARGET_NETWORK_ID) {
                try {
                    await window.ethereum.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: "0x61" }]
                    });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: "wallet_addEthereumChain",
                            params: [{
                                chainId: "0x61",
                                chainName: "BNB Smart Chain Testnet",
                                rpcUrls: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545/"],
                                nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                                blockExplorerUrls: ["https://testnet.bscscan.com"]
                            }]
                        });
                    } else {
                        throw switchError;
                    }
                }
            }
            account = (await provider.send("eth_requestAccounts", []))[0];
            playerData.walletAddress = account;

            // ENS रिज़ॉल्यूशन को बायपास करने के लिए साइनर प्राप्त करें
            const signer = await provider.getSigner();
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            WITHDRAWAL_FEE_BNB = ethers.formatUnits(await contract.withdrawalFeeInBnb(), "ether");
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            document.getElementById("connectWallet").style.display = "none";
            document.getElementById("disconnectWallet").style.display = "block";
            document.getElementById("walletAddress").textContent = `Connected: ${account.slice(0, 6)}...`;
            alert("Wallet connected!");
        } catch (error) {
            console.error("Wallet error:", error);
            alert("Failed to connect: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    function disconnectWallet() {
        account = null;
        contract = null;
        document.getElementById("connectWallet").style.display = "block";
        document.getElementById("disconnectWallet").style.display = "none";
        document.getElementById("walletAddress").textContent = "";
        updatePlayerHistoryUI();
        alert("Wallet disconnected!");
    }

    function getReferralLink() {
        if (!account) return alert("Connect wallet first!");
        const baseUrl = window.location.origin + window.location.pathname;
        const referralLink = `${baseUrl}?ref=${account}`;
        navigator.clipboard.writeText(referralLink).then(() => {
            alert(`Referral link copied: ${referralLink}`);
        }).catch(err => {
            console.error("Failed to copy referral link:", err);
            alert("Failed to copy referral link. Please copy manually: " + referralLink);
        });
    }

    async function loadPlayerHistory() {
        if (!contract || !account) {
            updatePlayerHistoryUI();
            return;
        }
        try {
            showLoading(true);
            const history = await contract.playerHistory(account);
            playerData.gamesPlayed = Number(history.gamesPlayed) || 0;
            playerData.totalRewards = Number(ethers.formatUnits(history.totalRewards || 0, 18));
            playerData.totalReferrals = Number(history.totalReferrals) || 0;
            playerData.referralRewards = Number(ethers.formatUnits(history.referralRewards || 0, 18));
            playerData.hasClaimedWelcomeBonus = history.hasClaimedWelcomeBonus || false;
            playerData.pendingRewards = Number(ethers.formatUnits(await contract.getInternalBalance(account), 18));
            playerData.walletBalance = Number(ethers.formatUnits(await contract.balanceOf(account), 18));
            playerData.flexibleStakeBalance = Number(ethers.formatUnits(history.flexibleStakeBalance || 0, 18));

            playerData.lockedStakeBalances[0] = playerData.flexibleStakeBalance;
            for (let i = 1; i <= 3; i++) {
                playerData.lockedStakeBalances[i] = Number(ethers.formatUnits(await contract.getLockedStakeBalance(account, i), 18));
                playerData.lockedStakeStartTimes[i] = Number(await contract.getLockedStakeStartTime(account, i));
            }

            const rewards = await contract.getRewardHistory(account);
            playerData.rewardHistory = rewards.map(reward => ({
                amount: Number(ethers.formatUnits(reward.amount, 18)),
                timestamp: Number(reward.timestamp) * 1000,
                rewardType: reward.rewardType,
                referee: reward.referee === ethers.ZeroAddress ? "N/A" : reward.referee
            }));

            updatePlayerHistoryUI();
            localStorage.setItem("playerData", JSON.stringify(playerData));
        } catch (error) {
            console.error("History error:", error);
            alert("Failed to load history: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    function updatePlayerHistoryUI() {
        document.getElementById("gamesPlayed").textContent = `Games Played: ${playerData.gamesPlayed || 0}`;
        document.getElementById("totalGameRewards").textContent = `Total Game Rewards: ${(playerData.totalRewards || 0).toFixed(2)} BST`;
        document.getElementById("totalReferrals").textContent = `Total Referrals: ${playerData.totalReferrals || 0}`;
        document.getElementById("referralRewards").textContent = `Referral Rewards: ${(playerData.referralRewards || 0).toFixed(2)} BST`;
        document.getElementById("pendingRewardsText").textContent = `Pending Rewards: ${(playerData.pendingRewards || 0).toFixed(2)} BST`;
        document.getElementById("flexibleStakeBalance").textContent = `Flexible Stake Balance: ${(playerData.flexibleStakeBalance || 0).toFixed(2)} BST`;
        document.getElementById("lockedStakeBalance3M").textContent = `Locked Stake Balance (3M): ${(playerData.lockedStakeBalances[1] || 0).toFixed(2)} BST`;
        document.getElementById("lockedStakeBalance6M").textContent = `Locked Stake Balance (6M): ${(playerData.lockedStakeBalances[2] || 0).toFixed(2)} BST`;
        document.getElementById("lockedStakeBalance12M").textContent = `Locked Stake Balance (12M): ${(playerData.lockedStakeBalances[3] || 0).toFixed(2)} BST`;
        document.getElementById("walletBalance").textContent = `Wallet Balance: ${(playerData.walletBalance || 0).toFixed(2)} BST`;
        document.getElementById("walletAddress").textContent = account ? `Connected: ${account.slice(0, 6)}...` : "";
        document.getElementById("rewardHistoryList").innerHTML = (playerData.rewardHistory || []).map(entry =>
            `<li>${entry.rewardType}: ${entry.amount.toFixed(2)} BST on ${new Date(entry.timestamp).toLocaleString()}${entry.referee !== "N/A" ? ` (Referee: ${entry.referee.slice(0, 6)}...)` : ""}</li>`
        ).join("");
    }

    document.getElementById("playGame").addEventListener("click", async () => {
        if (!account) return alert("Connect wallet first!");
        if (!isGameRunning) {
            showLoading(true);
            await resetGame().catch(err => console.error("Error resetting game:", err));
            isGameRunning = true;
            lastMoveTime = performance.now();
            animationFrameId = requestAnimationFrame(gameLoop);
            showLoading(false);
        }
    });
    document.getElementById("connectWallet").addEventListener("click", connectWallet);
    document.getElementById("disconnectWallet").addEventListener("click", disconnectWallet);
    document.getElementById("claimGameRewards").addEventListener("click", claimPendingRewards);
    document.getElementById("welcomeBonusButton").addEventListener("click", claimWelcomeBonus);
    document.getElementById("stakeTokens").addEventListener("click", stakeTokens);
    document.getElementById("unstakeTokens").addEventListener("click", unstakeTokens);
    document.getElementById("getReferralLink").addEventListener("click", getReferralLink);

    document.addEventListener("keydown", (event) => {
        if (isGameRunning) {
            if (event.key === "ArrowUp" && direction !== "down") direction = "up";
            if (event.key === "ArrowDown" && direction !== "up") direction = "down";
            if (event.key === "ArrowLeft" && direction !== "right") direction = "left";
            if (event.key === "ArrowRight" && direction !== "left") direction = "right";
        }
    });

    let touchStartX = 0, touchStartY = 0, lastTouchTime = 0;
    if (canvas) {
        canvas.addEventListener("touchstart", (event) => {
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        });
        canvas.addEventListener("touchmove", (event) => {
            if (!isGameRunning) return;
            const touch = event.touches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            if (Date.now() - lastTouchTime < 150) return;
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0 && direction !== "left") direction = "right";
                else if (deltaX < 0 && direction !== "right") direction = "left";
            } else if (Math.abs(deltaY) > 50) {
                if (deltaY > 0 && direction !== "up") direction = "down";
                else if (deltaY < 0 && direction !== "down") direction = "up";
            }
            lastTouchTime = Date.now();
        });
    }

    window.addEventListener("resize", updateCanvasSize);
    updateCanvasSize();
    generateBoxes();
    draw();
    updatePlayerHistoryUI();
});