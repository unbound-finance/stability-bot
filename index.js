const ethers = require('ethers');
const web3 = require('web3');

const UnboundDollarsABI = require('./abi/UnboundDai');
const UnboundValuatorABI = require('./abi/Valuator');
const UnboundLLCABI = require('./abi/UnboundLLCABI');
const UniswapRouterABI = require('./abi/UniswapRouter');
const UniswapPairABI = require('./abi/UniswapPair');
const ERC20ABI = require('./abi/ERC20');

const mnemonic = 'gallery cinnamon equal inform lend perfect kitchen grab today width eager thank';
const infuraKey = 'a4dcdfe968254cd4a2a30381e3558541';

const provider = new ethers.providers.JsonRpcProvider(`https://kovan.infura.io/v3/${infuraKey}`);
const wallet = new ethers.Wallet.fromMnemonic(mnemonic);
const signer = new ethers.Wallet(wallet.privateKey, provider);

const gasLimit = 500000;
const gasPrice = ethers.utils.parseUnits('30', 'gwei');

// change all the addresses
const config = {
  UND: '0xa729D5cA5BcE0d275B69728881f5bB86511EA70B',
  Valuator: '0xe8E0458bc6661848160a1b41b27c45A865e0E3B1',
  LLC_EthDai: '0x7A95c0193f2D77A2DD5b01A1069CE3Eb59E77017',
  DAI: '0x9CD539Ac8Dca5757efAc30Cd32da20CD955e0f8B',
  unisPair_UndDai: '0xa5c638db7a286b722406f03eaf5c8a8178927a19',
  unisPair_EthDai: '0x54870f44414e69af7eb2f3e1e144ebb7c79325b7',
  uniswapRouter: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  UNDAdmin: '0x2aD458F069A6D456690de46Acfa27EFA26748dA8',
};

// Unbound Dollars
const UnboundDollars = new ethers.Contract(config.UND, UnboundDollarsABI, signer);

// Unbound Valuator
const Valuator = new ethers.Contract(config.Valuator, UnboundValuatorABI, signer);

// UND-DAI LLC
const LLCContract = new ethers.Contract(config.LLC_EthDai, UnboundLLCABI, signer);

// UND-DAI Uniswap Pair
const UniswapPairUndDai = new ethers.Contract(config.unisPair_UndDai, UniswapPairABI, signer);

// ETH-DAI Uniswap Pair
const UniswapPairEthDai = new ethers.Contract(config.unisPair_EthDai, UniswapPairABI, signer);

// UND-DAI Uniswap Router
const UniswapRouter = new ethers.Contract(config.uniswapRouter, UniswapRouterABI, signer);

// DAI
const Dai = new ethers.Contract(config.DAI, ERC20ABI, signer);

/**
 * adjust function
 * Adjust UND price by total supply
 */
async function adjust() {
  try {
    const PoolUndDai = await _fetchPairInfo(UniswapPairUndDai, true);
    const PoolEthDai = await _fetchPairInfo(UniswapPairEthDai, false);

    const priceOfUnd = _calcPrice(PoolUndDai, config.UND);
    // const priceOfUnd = 1.000000000000001;// for testing
    // const priceOfUnd = 0.999999999999999;// for testing
    console.log(`UND price: ${priceOfUnd} Dai`);

    const targetPriceOfUnd = 1;
    const totalSupplyOfUnd = parseInt(await UnboundDollars.totalSupply());
    const adjustedTotalSupply = (totalSupplyOfUnd * priceOfUnd) / targetPriceOfUnd;
    console.log(`Total Supply: ${totalSupplyOfUnd}`);
    console.log(`Adjusted Supply: ${adjustedTotalSupply}`);

    // Confirm the signer has enough balance
    const poolBalance = await UniswapPairEthDai.balanceOf(signer.address);
    console.log(`signer pool balance: ${poolBalance}`);

    if (adjustedTotalSupply > totalSupplyOfUnd) {
      const mint = adjustedTotalSupply - totalSupplyOfUnd;

      const rates = await _fetchRates(Valuator, LLCContract);
      const reserveDai = _getStableTokenReserve(PoolEthDai, config.DAI);
      const lockAmount = parseInt((PoolEthDai.totalSupply * mint) / (reserveDai * 2) / rates.loanRate);
      console.log(`Mint UND Amount: ${mint}`);
      console.log(`Lock Pool Token: ${lockAmount}`);
      await UniswapPairEthDai.approve(LLCContract.address, lockAmount);
      await LLCContract.lockLPT(lockAmount, config.UND, { gasLimit });
    } else if (adjustedTotalSupply < totalSupplyOfUnd) {
      const burn = totalSupplyOfUnd - adjustedTotalSupply;

      const loaned = await UnboundDollars.checkLoan(signer.address, LLCContract.address);
      const locked = await LLCContract.tokensLocked(signer.address);
      const unlockAmount = parseInt((locked * burn) / loaned);
      console.log(`Burn UND Amount: ${burn}`);
      console.log(`Unlock Pool Token: ${unlockAmount}`);
      await LLCContract.unlockLPT(unlockAmount, config.UND, { gasLimit });
    }
  } catch (error) {
    console.log(error);
  }
}

async function _fetchPairInfo(uniPair, checkUND = false) {
  try {
    const totalSupply = parseInt(await uniPair.totalSupply());
    const token0 = await uniPair.token0();
    const token1 = await uniPair.token1();

    if (checkUND && token0 !== config.UND && token1 !== config.UND) {
      throw 'fetchPairUndDaiInfo: Neither token is UND';
    }

    const { _reserve0, _reserve1, _blockTimestampLast } = await uniPair.getReserves();

    if (parseInt(_reserve0) === 0 || parseInt(_reserve1) === 0) {
      throw 'fetchPairUndDaiInfo: Either reserve is 0';
    }

    return { totalSupply, token0, token1, reserve0: parseInt(_reserve0), reserve1: parseInt(_reserve1) };
  } catch (error) {
    throw error;
  }
}

async function _fetchRates(Valuator, LLC) {
  try {
    const { fee, loanrate } = await Valuator.getLLCStruct(LLC.address);
    const loanRate = loanrate / 10 ** 6;
    const feeRate = fee / 10 ** 6;

    return { loanRate, feeRate };
  } catch (error) {
    throw error;
  }
}

function _calcPrice(poolUndDai, undAddress) {
  return poolUndDai.token0 === undAddress
    ? poolUndDai.reserve1 / poolUndDai.reserve0
    : poolUndDai.reserve0 / poolUndDai.reserve1;
}

function _getStableTokenReserve(poolInfo, stableTokenAddress) {
  return poolInfo.token0 === stableTokenAddress ? poolInfo.reserve0 : poolInfo.reserve1;
}

/**
 * arbitrage function
 * Get an arbitrage from the difference of the price of UND
 */
async function arbitrage() {
  const PoolUndDai = await _fetchPairInfo(UniswapPairUndDai, true);
  console.log(PoolUndDai);
  const priceOfUnd = _calcPrice(PoolUndDai, config.UND);
  // const priceOfUnd = 1.000000000000001;// for testing
  // const priceOfUnd = 0.999999999999999;// for testing
  console.log(`UND Price: ${priceOfUnd}`);
  const amount = _culcSwapAmount(PoolUndDai.reserve0, PoolUndDai.reserve1);

  if (priceOfUnd > 1) {
    await short(amount, signer.address);
  } else if (priceOfUnd < 1) {
    await long(amount, signer.address);
  }

  const PoolUndDaiAfter = await _fetchPairInfo(UniswapPairUndDai, true);
  const priceOfUndAfter = _calcPrice(PoolUndDaiAfter, config.UND);
  console.log(PoolUndDaiAfter);
  console.log(`UND Price After Swap: ${priceOfUndAfter}`);
}

function _culcSwapAmount(reserve0, reserve1) {
  // const equal = Math.sqrt(reserve0 * reserve1);
  // return reserve0 > reserve1 ? reserve0 - equal : reserve1 - equal;
  return web3.utils.toWei('0.1', 'ether'); // for testing
}

async function approve() {
  const totalSupply = await UnboundDollars.totalSupply();
  try {
    const approve = UnboundDollars.approve(LLC_EthDai, totalSupply);
    console.log(approve);
    return approve;
  } catch (error) {
    console.log(error);
  }
}

async function mint(LPTamt) {
  try {
    const mintTx = await LLCContract.lockLPT(LPTamt, config.UND);
    console.log(mintTx);
    return mintTx;
  } catch (error) {
    console.log(error);
  }
}

async function short(amountIn, to) {
  // short UND when the price is more than 1 USD
  try {
    console.log('short');
    console.log(amountIn);
    const path = [config.UND, config.DAI];
    const amountOutMin = await UniswapRouter.getAmountsOut(amountIn, path);
    const now = new Date();
    const deadline = Math.floor(now.getTime() / 1000) + 100;

    // perform a swap
    const approve = await UnboundDollars.approve(UniswapRouter.address, amountIn);
    await approve.wait();
    const swap = await UniswapRouter.swapExactTokensForTokens(amountIn, amountOutMin[1], path, to, deadline, {
      gasLimit,
      gasPrice,
    });
    await swap.wait();
    return swap;
  } catch (error) {
    console.log(error);
  }
}

async function long(amountIn, to) {
  // long UND when the price is less than 1 USD
  try {
    console.log('long');
    console.log(amountIn);
    const path = [config.DAI, config.UND];
    const amountOutMin = await UniswapRouter.getAmountsOut(amountIn, path);
    const now = new Date();
    const deadline = Math.floor(now.getTime() / 1000) + 100;

    // perform a swap
    const approve = await Dai.approve(UniswapRouter.address, amountIn);
    await approve.wait();
    const swap = await UniswapRouter.swapExactTokensForTokens(amountIn, amountOutMin[1], path, to, deadline, {
      gasLimit,
      gasPrice,
    });
    // console.log(swap);
    await swap.wait();
    // console.log(wait);
    return swap;
  } catch (error) {
    console.log(error);
  }
}

// http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt
/* utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */
function Utf8ArrayToStr(array) {
  var out, i, len, c;
  var char2, char3;

  out = '';
  len = array.length;
  i = 0;
  while (i < len) {
    c = array[i++];
    switch (c >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12:
      case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0));
        break;
    }
  }

  return out;
}
