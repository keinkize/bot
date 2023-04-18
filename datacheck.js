const Binance = require('binance-api-node').default;
const axios = require('axios');

// Tạo đối tượng Binance API
const binance = Binance();
const appScriptUrl = `https://script.google.com/macros/s/AKfycbxJ4hRePD4N3HH3XXLs9sODsbgIBdSBFd8_7hOl0OXxrfEqHUWoNpqS-6YF-tOZjrIR/exec`;

// Hàm lấy thông tin của những đồng coin đang tăng giá (top gainer)
async function getTopGainers() {
    try {
        const prices = await binance.prices();
        const symbolList = Object.keys(prices);
        const ticker24hList = await binance.dailyStats();
        const topGainers = [];
        for (const symbol of symbolList) {
            const ticker24h = ticker24hList.find(ticker => ticker.symbol === symbol);
            if (ticker24h) {
                const priceChangePercent = parseFloat(ticker24h.priceChangePercent);
                if (priceChangePercent > 16 && symbol.includes('USDT')) {
                    const coinData = {
                        symbol: symbol,
                        priceChangePercent: priceChangePercent + '%'
                    };
                    topGainers.push(coinData);
                }
            }
        }
        const outputData = [];
        // Sắp xếp theo % giá tăng giảm
        topGainers.sort((a, b) => a.priceChangePercent - b.priceChangePercent);
        for (let i = 0; i < topGainers.length; i++) {
            const obj = topGainers[i];
            const keys = Object.keys(obj);
            const item = [];
            for (let j = 0; j < keys.length; j++) {
                const key = keys[j];
                const value = obj[key];
                item.push(value);
              }
            outputData.push(item);
        }
        await axios.post(appScriptUrl, outputData)
            .then(response => {
                console.log('Dữ liệu đã được thêm vào Google Sheet:', response.data);
            })
            .catch(error => {
                console.error('Lỗi khi thêm dữ liệu vào Google Sheet:', error);
            });
    } catch (error) {
        console.error(`Lỗi lấy dữ liệu từ Binance: ${error}`);
    }
}

// Lặp lại hàm lấy thông tin của những đồng coin đang tăng giá (top gainer) mỗi 10 giây
setInterval(getTopGainers, 10000);
