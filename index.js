const ccxt = require('ccxt');
const moment = require('moment');
const delay = require('delay');
const rsi = require('trading-indicator').rsi;
const bb = require('trading-indicator').bb;
const axios = require('axios');
require('dotenv').config();

const tick = async (coin, config, binance) => {
    try {
        const { base, allocation, spread } = config;
        ///Cặp giao dịch
        const symbol = coin;
        /// Hủy lệnh thuộc cặp giao dịch còn trên account
        // symbols.forEach(async dt => {
        //     const symbol = dt;
        //     const order = await binance.fetchOpenOrders(symbol);
        //     if (order.length > 0) {
        //         order.forEach(async order => {
        //             await binance.cancelOrder(order.id);
        //         });
        //     }
        // })
        const price = await binance.fetchOHLCV(symbol, '1m', undefined, 5).catch(e => { console.log(e) });
        if (price.length > 0) {
            const bPrices = price.map(price => {
                return {
                    timestamps: moment(price[0]).format('YYYY/MM/DD HH:mm:ss'),
                    open: price[1],
                    high: price[2],
                    low: price[3],
                    close: price[4],
                    vol: price[5]
                }
            })
            console.log(`Coin ${coin} :` + bPrices[bPrices.length - 1].close);
            const marketPrice = bPrices[bPrices.length - 1].close;
            const times = bPrices[bPrices.length - 1].timestamps
            /// lấy chỉ báo
            const rsiData = await rsi(6, "close", 'binance', symbol, "15m", true).catch(e => { console.log(e) })
            const bbData = await bb(10, 3, "close", "binance", symbol, "15m", true).catch(e => { console.log(e) })
            if (rsiData.length > 0 && bbData.length > 0) {
                const val_RSI = rsiData[rsiData.length - 1];
                const val_BB = bbData[bbData.length - 1];
                /// Hiển thị số tiền Balance
                const balance = await binance.fetchBalance().catch(e => { console.log(e) });
                /// Số tiền usdt khả dụng
                const assetBalance = balance.free[base];
                /// Tổng số tiền 
                const asset = balance.total[base];
                /// Khối lượng bán/mua
                const USD_T = (assetBalance * allocation)* 20;
                const Vol = USD_T/marketPrice;
                const Cal = (USD_T * (1 + 0.003)/Vol);
                
                if (binance.has['fetchOrders'])
                    order = await binance.fetchOpenOrders(symbol);
                if (order.length > 0) {
                    console.log(`Lệnh đã được mở`)
                } else {
                    /// Thuat toan
                    // && marketPrice > val_BB.upper
                    if (val_RSI > 75) {
                        const side = 'sell';
                        /// Giá bán
                        const sellPrice = marketPrice;
                        const params = {
                            'positionSide': 'SHORT',
                            'takeProfitPrice': (USD_T * (1 - 0.003)/Vol),
                            'stopLossPrice': (USD_T * (1 + 0.003)/Vol)
                        }
                        const order = await binance.createOrder(symbol, 'market', side, Vol, sellPrice, params).catch(e => { console.log(e) })
                        console.log(`Short ${symbol} ở giá ${sellPrice} với ${USD_T} USDT`);
                        // && marketPrice < val_BB.lower
                    } else if (val_RSI < 25) {
                        const side = 'buy';
                        /// Giá Mua
                        const buyPrice = marketPrice;
                        const params = {
                            'positionSide': 'LONG',
                            'stopLossPrice': (USD_T * (1 + 0.003)/Vol),
                            'takeProfitPrice': (USD_T * (1 - 0.003)/Vol)
                        }
                        const order = await binance.createOrder(symbol, 'market', side, Vol, buyPrice, params).catch(e => { console.log(e) })
                        console.log(`Long ${symbol} ở giá ${buyPrice} với ${USD_T} USDT`);
                    }
                }
                console.log(`[${times}] Total Balance Free : ${assetBalance} USDT`);
                console.log(`[${times}] Total : ${asset} USDT`);
            }
        }
        console.log('------------------------------------------');
    } catch (error) {
        console.log(error)
    }

}
// ['ETH/USDT', 'DOT/USDT', 'LINK/USDT','OP/USDT']
async function run() {
    try {
        const config = {
            base: 'USDT',
            allocation: 0.1,
            spread: 0.08
        }
        const binance = new ccxt.binance({
            apiKey: process.env.API_KEY,
            secret: process.env.API_SECRET,
            options: {
                'defaultType': 'future', // chế độ future
                'dualSidePosition': true,
                'positionSide': 'BOTH'
            },
        });

        while (true) {
            await tick('ETH/USDT', config, binance);
            await tick('BTC/USDT', config, binance);
            await tick('OP/USDT', config, binance);
            await tick('LINK/USDT', config, binance);
            await tick('DOT/USDT', config, binance);
            await tick('NEAR/USDT', config, binance);
            await tick('NEO/USDT', config, binance);
            await tick('DOGE/USDT', config, binance);
            await tick('BNB/USDT', config, binance);
            await tick('TRX/USDT', config, binance);
        }
        // setInterval(tick, config.tickInverval, config, binance)
    } catch (error) {
        console.log(error)
    }
}
run();
