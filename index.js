const ccxt = require('ccxt');
const moment = require('moment');
const delay = require('delay');
const rsi = require('trading-indicator').rsi;
const bb = require('trading-indicator').bb;
const axios = require('axios');
require('dotenv').config();

const tick = async (config, binance) => {
    try {
        const { base, allowcation, spread } = config;
        ///Cặp giao dịch
        const symbols = ['NEAR/USDT', 'BTC/USDT', 'ETC/USDT', 'ETH/USDT', 'DOT/USDT', 'LINK/USDT']
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

        symbols.forEach(async dt => {
            const symbol = dt;
            const price = await binance.fetchOHLCV(symbol, '1m', undefined, 5).catch(e => { console.log(e) });
            delay(1000);
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
                const marketPrice = bPrices[bPrices.length - 1].close;
                const times = bPrices[bPrices.length - 1].timestamps
                /// lấy chỉ báo
                const rsiData = await rsi(6, "close", 'binance', symbol, "15m", true).catch(e => { console.log(e) })
                const bbData = await bb(36, 4, "close", "binance", symbol, "15m", true).catch(e => { console.log(e) })
                /// Hiển thị số tiền Balance
                const balance = await binance.fetchBalance().catch(e => { console.log(e) });
                /// Số tiền usdt khả dụng
                const assetBalance = balance.free[base];
                /// Tổng số tiền 
                const asset = balance.total[base];
                /// Khối lượng bán/mua
                const Vol = assetBalance * allowcation;
                const status = await binance.fetchOpenOrders(symbol).catch(e => { console.log(e) })
                if (status.length > 0) {
                    console.log(`Lệnh đã được mở`)
                } else {
                    /// Thuat toan
                    if (rsiData[rsiData.length - 1] > 73 && marketPrice > bbData[bbData.length - 1].upper) {
                        const side = 'sell';
                        /// Giá bán
                        const sellPrice = marketPrice;
                        const params = {
                            'stopLoss': {
                                'type': 'limit', // or 'market'
                                'price': marketPrice * (1 + 0.02),
                                'triggerPrice': marketPrice * (1 + 0.06),
                            },
                            'takeProfit': {
                                'type': 'limit',
                                'triggerPrice': marketPrice * (1 - spread),
                            }
                        }
                        const order = await exchange.createOrder(symbol, 'market', side, Vol, sellPrice, params).catch(e => { console.log(e) })
                        console.log(`Short ${symbol} ở giá ${sellPrice} với ${Vol} USDT`);
                    } else if (rsiData[rsiData.length - 1] < 27 && marketPrice < bbData[bbData.length - 1].lower) {
                        const side = 'buy';
                        /// Giá Mua
                        const buyPrice = marketPrice;
                        const params = {
                            'stopLoss': {
                                'type': 'limit', // or 'market'
                                'price': marketPrice * (1 - 0.02),
                                'triggerPrice': marketPrice * (1 - 0.06),
                            },
                            'takeProfit': {
                                'type': 'limit',
                                'triggerPrice': marketPrice * (1 + spread),
                            }
                        }
                        const order = await exchange.createOrder(symbol, 'market', side, Vol, buyPrice, params).catch(e => { console.log(e) })
                        console.log(`Long ${symbol} ở giá ${buyPrice} với ${Vol} USDT`);
                    }
                }
                console.log(`[${times}] Total Balance Free : ${assetBalance} USDT`)
                console.log(`[${times}] Total : ${asset} USDT`)
            }
        })
        console.log('------------------------------------------')
    } catch (error) {
        console.log(error)
    }

}

const run = () => {
    try {
        const config = {
            base: 'USDT',
            allocation: 0.1,
            spread: 0.08,
            tickInverval: 9000
        }
        const binance = new ccxt.binance({
            apiKey: process.env.API_KEY,
            secret: process.env.API_SECRET,
            options: {
                'defaultType': 'future' // chế độ future
            },
        });
        tick(config, binance)
        setInterval(tick, config.tickInverval, config, binance)
    } catch (error) {
        console.log(error)
    }
}
run();
