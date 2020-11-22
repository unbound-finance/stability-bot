const ethers = require('ethers');
const web3 = require('web3');

const UnboundDollarsABI = require('./abi/UnboundDai');
const UnboundValuatorABI = require('./abi/Valuator');
const UnboundLLCABI = require('./abi/UnboundLLCABI');
const UniswapRouterABI = require('./abi/UniswapRouter');
const UniswapPairABI = require('./abi/UniswapPair');

const mnemonic = 'gallery cinnamon equal inform lend perfect kitchen grab today width eager thank';
const infuraKey = 'a4dcdfe968254cd4a2a30381e3558541';

const provider = new ethers.providers.JsonRpcProvider(`https://kovan.infura.io/v3/${infuraKey}`);
const wallet = new ethers.Wallet.fromMnemonic(mnemonic);
const signer = new ethers.Wallet(wallet.privateKey, provider);

// change all the addresses
config = {
  UND: '0xc266314a87744E94E6F2FC1130d6C5E43FaB0E75',
  Valuator: '0x9fC541FCC54Ded46CD69a112d0f27584fb081e45',
  LLC_Dai: '0xBCad91504416c968fD1b0ed2E10e3bC91E65af8c',
  DAI: '0xc30d0164Fb4c013dB62E32d48f81BeD92735d97a',
  unisPair_UndDai: '0x0ab8f8efa4aa3f60a7e20fb6142a3d144008a469',
  unisPair_EthDai: '0x266480906fd0aa3edd7ff64f466ea9684b792179',
  uniswapRouter: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
};

// Unbound Dollars
const UnboundDollars = new ethers.Contract(config.UND, UnboundDollarsABI, signer);

// Unbound Valuator
const Valuator = new ethers.Contract(config.Valuator, UnboundValuatorABI, signer);

// UND-DAI LLC
const LLCContract = new ethers.Contract(config.LLC_Dai, UnboundLLCABI, signer);

// UND-DAI Uniswap Pair
const UniswapPairUndDai = new ethers.Contract(config.unisPair_UndDai, UniswapPairABI, signer);

// ETH-DAI Uniswap Pair
const UniswapPairEthDai = new ethers.Contract(config.unisPair_EthDai, UniswapPairABI, signer);

// UND-DAI Uniswap Router
const UniswapRouter = new ethers.Contract(config.uniswapRouter, UniswapRouterABI, signer);

async function adjust() {
  try {
    const PoolUndDai = await fetchPairInfo(UniswapPairUndDai, true);
    const PoolEthDai = await fetchPairInfo(UniswapPairEthDai, false);

    const priceOfUnd = calcPrice(PoolUndDai, config.UND);
    // const priceOfUnd = 1.000000000000001;
    // const priceOfUnd = 0.999999999999999;
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

      const rates = await fetchRates(Valuator, LLCContract);
      const reserveDai = getStableTokenReserve(PoolEthDai, config.DAI);
      const lockAmount = parseInt((PoolEthDai.totalSupply * mint) / (reserveDai * 2) / rates.loanRate);
      console.log(`Mint UND Amount: ${mint}`);
      console.log(`Lock Pool Token: ${lockAmount}`);
      await UniswapPairEthDai.approve(LLCContract.address, lockAmount);
      await LLCContract.lockLPT(lockAmount, config.UND, { gasLimit: 150000 });
    } else if (adjustedTotalSupply < totalSupplyOfUnd) {
      const burn = totalSupplyOfUnd - adjustedTotalSupply;

      const loaned = await UnboundDollars.checkLoan(signer.address, LLCContract.address);
      const locked = await LLCContract.tokensLocked(signer.address);
      const unlockAmount = parseInt((locked * burn) / loaned);
      console.log(`Burn UND Amount: ${burn}`);
      console.log(`Unlock Pool Token: ${unlockAmount}`);
      await LLCContract.unlockLPT(unlockAmount, config.UND, { gasLimit: 150000 });
    }
  } catch (error) {
    console.log(error);
  }
}

async function fetchPairInfo(uniPair, checkUND = false) {
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

async function fetchRates(Valuator, LLC) {
  try {
    const { fee, loanrate } = await Valuator.getLLCStruct(LLC.address);
    const loanRate = loanrate / 10 ** 6;
    const feeRate = fee / 10 ** 6;

    return { loanRate, feeRate };
  } catch (error) {
    throw error;
  }
}

function calcPrice(poolUndDai, undAddress) {
  return poolUndDai.token0 === undAddress
    ? poolUndDai.reserve1 / poolUndDai.reserve0
    : poolUndDai.reserve0 / poolUndDai.reserve1;
}

function getStableTokenReserve(poolInfo, stableTokenAddress) {
  return poolInfo.token0 === stableTokenAddress ? poolInfo.reserve0 : poolInfo.reserve1;
}

async function approve() {
  const totalSupply = await UnboundDollars.totalSupply();
  try {
    const approve = UnboundDollars.approve(LLC_Dai, totalSupply);
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

async function short(amountIn) {
  // short UND when the price is less than 1 USD
  // supply more UND by locking UND-DAI LPT's and buy DAI
  try {
    const path = [UND, DAI];
    const amountOutMin = await UniswapRouter.getAmountsOut(path);

    // Unbound Admin Address
    const to = '0x2aD458F069A6D456690de46Acfa27EFA26748dA8';
    const deadline = +new Date() + 10000;

    // perform a swap
    const swap = await UniswapRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
    console.log(swap);
    return swap;
  } catch (error) {
    console.log(error);
  }
}

async function long(LPTamt) {
  // short UND when the price is more than 1 USD
  // buy UND
  try {
    const path = [DAI, UND];
    const amountOutMin = await UniswapRouter.getAmountsOut(path);

    // Unbound Admin Address
    const to = '0x2aD458F069A6D456690de46Acfa27EFA26748dA8';
    const deadline = +new Date() + 10000;

    // perform a swap
    const swap = await UniswapRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
    console.log(swap);
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


adjust()