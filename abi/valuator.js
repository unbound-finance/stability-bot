module.exports = [
    {
      inputs: [
        {
          internalType: 'address',
          name: 'UND',
          type: 'address',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
    {
      inputs: [],
      name: 'rateBalance',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
      constant: true,
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amount',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'user',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'token',
          type: 'address',
        },
      ],
      name: 'unboundCreate',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'toUnlock',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'totalLocked',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'user',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'token',
          type: 'address',
        },
      ],
      name: 'unboundRemove',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'LLC',
          type: 'address',
        },
      ],
      name: 'getLLCStruct',
      outputs: [
        {
          internalType: 'uint256',
          name: 'fee',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'loanrate',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
      constant: true,
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'uToken',
          type: 'address',
        },
      ],
      name: 'allowToken',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'LLC',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'loan',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'fee',
          type: 'uint256',
        },
      ],
      name: 'addLLC',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'LLC',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'loan',
          type: 'uint256',
        },
      ],
      name: 'changeLoanRate',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'LLC',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'fee',
          type: 'uint256',
        },
      ],
      name: 'changeFeeRate',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'LLC',
          type: 'address',
        },
      ],
      name: 'disableLLC',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'isOwner',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool',
        },
      ],
      stateMutability: 'view',
      type: 'function',
      constant: true,
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: '_newOwner',
          type: 'address',
        },
      ],
      name: 'setOwner',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ];