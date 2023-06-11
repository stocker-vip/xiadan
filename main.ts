// deno-lint-ignore-file no-namespace
// import iconv from 'npm:iconv-lite';
import {  codeWithSymbol } from 'https://cdn.jsdelivr.net/gh/stocker-vip/utils@v0.0.4/mod.ts'
// function toBuffer ( ab: ArrayBuffer )
// {
//     var buf = new Buffer( ab.byteLength );
//     var view = new Uint8Array( ab );
//     for ( var i = 0; i < buf.length; ++i )
//     {
//         buf[ i ] = view[ i ];
//     }
//     return buf;
// }

export enum Status
{
    Buy = "B",
    Sell = "S"
}

export type OrderStatus = { status: string }

export type Error = {
    msg: string;
    status: string;
}

export const GenerateError = ( msg: string ): Error => ( { msg, status: "ERROR" } )

export type Result<T> = T | Error;

export const isError = <T extends object> ( result: Result<T> ): result is Error =>
{
    if ( 'status' in result )
    {
        return result.status === "ERROR"
    }
    return false
}

export type OrderSuccess = {
    order_id: string;
    status: string
}

export type CancelOrderSuccess = {
    msg: string;
    status: string;
}

/**
 * 
 * {
   "data" : [
     {
      "datetime": "2023052400:38:20",
      "dealt_id": "",
      "dealt_price": 0.0,
      "dealt_volume": 0,
      "order_id": "759",
      "order_price": 1.05,
      "order_state": "�ѳ�(����)",
      "order_type": "֤ȯ����",
      "order_volume": 100,
      "stock_account": "0176918592",
      "stock_code": "159920",
      "stock_name": "����ETF",
      "stock_type": "���ڣ���"
    },
   ],
   "status" : "OK"
}
 */

export namespace Orders
{
    export interface Root
    {
        data: Daum[]
        status: string
    }

    export interface Daum
    {
        datetime: string
        dealt_id: string
        dealt_price: number
        dealt_volume: number
        order_id: string
        order_price: number
        order_state: string
        order_type: string
        order_volume: number
        stock_account: string
        stock_code: string
        stock_name: string
        stock_type: string
    }
}

/**
 * 
 * {
   "data" : [
      {
         "cost_price" : 2.8279999999999998,     //成本价
         "cost_value" : 257.82999999999998,     //买入市值
         "curr_profit" : -23.399999999999999,   //浮盈
         "index" : 0,                           //序号
         "market" : "SH",                       //市场
         "market_value" : 259.39999999999998,   //当前市值
         "profit_ratio" : -8.2743990000000007,  //盈亏率
         "stock_code" : "510050",               //代码
         "stock_name" : "50ETF",                //名称
         "stock_type" : "上海Ａ股",              //股票类型
         "vol_actual" : 100,                    //实际数量
         "vol_evenup" : 100,                    //可卖数量
         "vol_hold" : 100,                      //持股数量
         "vol_remain" : 100                     //股票余额
      },
   ],
   "status" : "OK"
}
 */
export namespace Positions
{
    export interface Root
    {
        data: Daum[]
        status: string
    }

    export interface Daum
    {
        cost_price: number
        cost_value: number
        curr_profit: number
        index: number
        market: string
        market_price: number
        market_value: number
        profit_ratio: number
        stock_code: string
        stock_name: string
        stock_type: string
        vol_actual: number
        vol_evenup: number
        vol_hold: number
        vol_remain: number
    }

}

/**
 * {
   "data" : {
      "asset_account" : "5207707",           // 资金账号
      "free_amount" : "",                    // 资金余额
      "free_capital" : "-526.90",            // 可取金额
      "frozen_capital" : "",                 // 冻结金额
      "position_profit" : "-24.50",          // 持仓盈亏
      "stock_cw" : "0.00",                   // 
      "stock_market_value" : "526.90",       // 股票总市值
      "today_profit" : "------",             // 当日盈亏
      "total_asset" : "",                    // 总资产
      "total_capital" : ""                   // 可用金额
   },
   "status" : "OK"
}
 */
export namespace Account
{
    export interface Root
    {
        data: Data
        status: string
    }

    export interface Data {
        asset_account: string
        broker: string
        free_amount: string
        free_capital: string
        frozen_capital: string
        position_profit: string
        stock_cw: string
        stock_market_value: string
        today_profit: string
        total_asset: string
        total_capital: string
      }

}


export class Order
{
    constructor ( private host: string, private port: string )
    {

    }

    domain (): string
    {
        return `http://${ this.host }:${ this.port }`
    }

    async fetcher<T extends OrderStatus> ( path: string )
    {
        const url = this.domain() + path
        const res = await fetch( url )
        if ( res.status !== 200 ) return GenerateError( '网络错误' );
        const buffer = await res.arrayBuffer()
        // const text = iconv.decode( toBuffer( buffer ), 'gbk' )
        // const text = iconv.decode( Deno.Buffer.from( buffer ), 'gbk' )
        const text = new TextDecoder('gbk').decode( buffer )
        const json = text.replace( /[\r\n]/g, '' )

        return JSON.parse( json ) as Result<T>
    }

    order = ( code: string, price: number, amount: number, status: Status ) => this.fetcher<OrderSuccess>( `/placeorder?symbol=${ codeWithSymbol( code ).toUpperCase() }&price=${ price }&volume=${ amount * 100 }&type=${ status }` )

    cancelOrder = ( orderId: string ) => this.fetcher<CancelOrderSuccess>( `/cancelorder?orderid=${ orderId }` )

    orders = () => this.fetcher<Orders.Root>( `/orders` )

    queryOrder = async ( orderId: string ) =>
    {
        const orders = await this.orders()
        if ( isError( orders ) ) return orders
        const order = orders.data.find( order => order.order_id === orderId )
        if ( !order )
        {
            return GenerateError( "订单不存在" )
        }
        return order
    }

    positions = () => this.fetcher<Positions.Root>( '/positions' )

    account = () => this.fetcher<Account.Root>( '/account' )

}