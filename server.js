
import KiteConnect from 'KiteConnect'
import moment from 'moment'
import chalk from 'chalk'

const target = {
    "friday": { diff: 200, total: 200 },
    "monday": { diff: 200, total: 180 },
    "tuesday": { diff: 100, total: 220 },
    "wednesday": { diff: 100, total: 180 },
    "thursday": { diff: 100, total: 120, cepe: true }
}
const generateBanKNiftyList = (last_price) => {
    const thursday=4,wednesday=3
    const getNextThursday = (fromDate) => {
        const thursday=4,nextThursday=11
        const isdayLessThanFriday=(day)=>day<thursday+1
        const daysToThursday=(day)=> thursday-day   
        const daysToNextThursday=(day)=> nextThursday-day 
        if(!(fromDate instanceof Date||fromDate instanceof moment)){
            return null
        }
        if (fromDate instanceof Date) {
            fromDate=moment(fromDate)
        } 
        let day= fromDate.isoWeekday()
        let daystoThursday= isdayLessThanFriday(day)?daysToThursday(day):daysToNextThursday(day);    
        return fromDate.add(daystoThursday,'days');
    }
    const isExpiryNotFinalWeek =(expiryDate)=>{
        const isSameMonth=(Date1,Date2)=> (Date1 && Date2 && Date1.format("M")==Date2.format("M"))
        let nextThursdayfromExpiry= getNextThursday(expiryDate)
       return  isSameMonth(expiryDate,nextThursdayfromExpiry)
    }
    const isNotWednesdayorThursday= (fromDate)=> !([wednesday,thursday].includes(fromDate.isoWeekday()))
    const generateBankNiftyName=(expiryDay,last_price,pe_ce)=> `BANKNIFTY${(expiryDay.format("YY"))}${expiryDay.format("M").toUpperCase()}${expiryDay.format('D')}${last_price}${pe_ce}`
    // --------------------------------------------------------------------------------------------------------
    let day = moment().format('dddd').toLowerCase()
    last_price -= 200;
    let bankNifty = [];
    let expiryDay = getNextThursday(moment())
    const optionPoints=100;
   // ---------------------------------------------------------------------------------------------------------
    for (let index = 1; index <= 4; index++) {
        if (isExpiryNotFinalWeek(expiryDay)) {
            let delta=optionPoints;
            let pe = generateBankNiftyName(expiryDay,last_price,'PE')
            let ce = generateBankNiftyName(expiryDay,last_price+delta,'CE')
            bankNifty.push({ pe, ce, diff: delta, total: 0, targetTotal: target[day].total });
            if(isNotWednesdayorThursday(expiryDay)){
            delta=optionPoints*2;
            pe = generateBankNiftyName(expiryDay,last_price,'PE')
            ce = generateBankNiftyName(expiryDay,last_price+delta,'CE')
            bankNifty.push({ pe, ce, diff: delta,total: 0, targetTotal: target[day].total });
            }
            last_price += optionPoints;
        }
        else{

        }
    }
    return bankNifty;

}
const dispMessage=(req)=>{
    let day= moment().format('dddd').toLowerCase()
    let msg=target[day] && target[day].total<req.total ?chalk.yellow(" wait for  "):chalk.green(" trade now, you are within ")
    let delta =req.diff==100?chalk.blue(`▲ -${req.diff}`):chalk.red(`▲ -${req.diff}`);
    let points =req.diff==100?chalk.blue(target[day] && Math.abs(req.total-target[day].total)):chalk.red(target[day] && Math.abs(req.total-target[day].total))
    return `PE- ${req.pe.name} ${req.pe.ltp}     CE- ${req.ce.name} ${req.ce.ltp}     Total- ${req.total}      ${delta}  ${msg} ${points} points`
   // return `current total is ${total}${target[day] && target[day].total<total ?" wait for  ":" trade now, you are within "} ${target[day] && Math.abs(total-target[day].total)} points`

}

const login = ({ apiSecret = 'ab972y2euma463jyba8qi1mctey72a1k', postLogin }) => {
    var kc = new KiteConnect.KiteConnect({
        api_key: "9sqky33say5ubisf"
    });
    console.log('apiSecret', apiSecret)
    console.log('getLoginURL', kc.getLoginURL())
    let reqToken = 'Z6Ex7zBcbSBulG7egJh1YZJJyUks0UNc'
    console.log('kc', kc)
    kc.generateSession(reqToken, apiSecret)
        .then(res => { setInterval(postLogin, 30000, kc) })
        .catch(err => console.log('err', err, kc.getLoginURL()))
}

const getCurrentBankNiftyName = () => {
    return `BANKNIFTY${(moment().format("YY"))}${moment().format("MMM").toUpperCase()}FUT`
}
const findBankNifty = (instruments, kc) => {
    //console.log('getCurrentBankNiftyName()', getCurrentBankNiftyName())
    //console.log('findBankNifty', instruments.filter(it => it.exchange == 'NFO'&& it.instrument_type=='CE' &&it.tradingsymbol.includes('31000') && it.tradingsymbol.includes('BANKNIFTY')))
    let curBankNifty = instruments.filter(it => it.exchange == 'NFO' && it.tradingsymbol.includes(getCurrentBankNiftyName()))
    curBankNifty = curBankNifty ? curBankNifty[0] : null
    kc.getLTP([`NFO:${curBankNifty.tradingsymbol}`]).then((ltp) => {
        let last_price = ltp[`NFO:${curBankNifty.tradingsymbol}`].last_price
        console.log('last_Price', last_price)
        let bal = last_price % 100;
        last_price -= bal;
        let bnList=generateBanKNiftyList(last_price)
        let bnProcessedList=[]
        bnList.forEach(bn => {            
            kc.getLTP([`NFO:${bn.pe}`]).then(peltp => {
                let pe_last_price = peltp[`NFO:${bn.pe}`].last_price
                kc.getLTP([`NFO:${bn.ce}`]).then(celtp => {
                    let ce_last_price = celtp[`NFO:${bn.ce}`].last_price
                    let total =ce_last_price+pe_last_price
                   // console.log(`sum of ${bn.ce}-${ce_last_price} and ${bn.pe}-${pe_last_price} is ${ce_last_price + pe_last_price}`)
                    //console.log(dispMessage(ce_last_price+pe_last_price)) ;
                    let msg=dispMessage({ce:{name:bn.ce,ltp:ce_last_price},pe:{name:bn.pe,ltp:pe_last_price},total,diff:bn.diff,target:bn.target})
                    console.log( msg)
                }).catch(err => console.log('err', err))
            })
        });
    })
}

const getAllInstruments = (kc) => {
    kc.getInstruments()
        .then(res => console.log('res', findBankNifty(res, kc)))
        .catch(err => console.log('err'))
};


login({ postLogin: getAllInstruments });





//res.filter(it=>it.exchange=='NSE' && instrument_type!='EQ' )// 25 above