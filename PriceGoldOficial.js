import React from "react";
import Loader from "../Loader";
import country from "../../assets/country.json";
import { formatPrice } from "../formatPrice";

class PriceOfGold extends React.Component {
    state = {
        loader: true,
        country: "",
        defaultUrl: "/",
    };
    componentDidMount = () => {
        //change the currency default based on the country page
        var defaultCurr = "USD";
        var metalPrice = "xauPrice";
        var metalChange = "chgXau";
        var metalClose = "xauClose";
        if (window.location.hostname.includes("silverprice.org")) {
            metalPrice = "xagPrice";
            metalChange = "chgXag";
            metalClose = "xagClose";
        }
        const fetchData = async () => {
            // await fetch(`https://${window.location.hostname}/country?_format=json`)
            // .then((res) => res.json())
            // .then((res) => {
            //     res.filter(item => window.location.href.includes(item.view_node)).map(item => {
            //         this.setState({
            //             defaultCurrency: item.field_currency_symbol,
            //             country: 'in ' + item.title.split(' ').pop(),
            //             defaultUrl: item.view_node
            //         })
            //         defaultCurr = item.field_currency_symbol
            //         return null;
            //     })
            //     fetch(`https://data-asg.goldprice.org/dbXRates/${defaultCurr}`)
            //     .then(res => res.json())
            //     .then(
            //         (result) => {
            //             this.setState({
            //             gold: result.items[0][metalPrice].toFixed(2),
            //             val: result.items[0][metalChange].toFixed(2),
            //             oldGold: result.items[0][metalClose].toFixed(2),
            //             time: result.date,
            //             });
            //         },
            //     )
            //     this.setState({
            //         loader: false,
            //     })
            //     })
            //     .catch((e) => console.error(e));
            country
                .filter((item) => window.location.href.includes(item.view_node))
                .map((item) => {
                    this.setState({
                        defaultCurrency: item.field_currency_symbol,
                        // country: 'in ' + item.title.split(' ').pop(),
                        country:
                            "in " + item.title.replace(/^(Silver|Gold) Price\s*/, "").trim(),
                        defaultUrl: item.view_node,
                    });
                    defaultCurr = item.field_currency_symbol;
                    return null;
                });
            fetch(`https://data-asg.goldprice.org/dbXRates/${defaultCurr}`)
                .then((res) => res.json())
                .then((result) => {
                    this.setState({
                        gold: result.items[0][metalPrice].toFixed(2),
                        val: result.items[0][metalChange].toFixed(2),
                        oldGold: result.items[0][metalClose].toFixed(2),
                        time: result.date,
                    });
                });
            this.setState({
                loader: false,
            });
        };
        fetchData();
        setInterval(() => {
            fetch(`https://data-asg.goldprice.org/dbXRates/${defaultCurr}`)
                .then((res) => res.json())
                .then((result) => {
                    this.setState({
                        gold: result.items[0][metalPrice].toFixed(2),
                        val: result.items[0][metalChange].toFixed(2),
                        oldGold: result.items[0][metalClose].toFixed(2),
                        time: result.date,
                        loader: false,
                    });
                });
        }, 10000);
    };
    render() {
        const gram = (this.state.gold / 31.1035).toFixed(2);
        const oldGram = (this.state.oldGold / 31.1035).toFixed(2);
        const diffGram = (gram - oldGram).toFixed(2);
        const kg = (this.state.gold / 0.0311035).toFixed(2);
        const oldKg = (this.state.oldGold / 0.0311035).toFixed(2);
        const diffKg = (kg - oldKg).toFixed(2);
        var metal = "Gold";
        var ounceUrl = "/gold-price.html";
        var gramUrl = "/gold-price-per-gram.html";
        var kiloUrl = "/gold-price-per-kilo.html";
        if (window.location.hostname.includes("silverprice.org")) {
            metal = "Silver";
            ounceUrl = "/silver-price-per-ounce.html";
            gramUrl = "/silver-price-per-ounce.html";
            kiloUrl = "/silver-price-per-kilo.html";
        }

        return (
            <div className="col-12">
                <div className="price-gold-table" translate="no">
                    {this.state.loader ? (
                        <Loader />
                    ) : (
                        <table className="table table-bordered w-100">
                            <thead>
                            <tr>
                                <th colSpan="3" className="text-center">
                                    <h3 className="blue-title black">
                                        <a href={this.state.defaultUrl}>
                                            Price Of {metal} {this.state.country}
                                        </a>
                                    </h3>
                                </th>
                            </tr>
                            </thead>

                            <tbody>
                            <tr>
                                <td>
                                    <a href={ounceUrl}>{metal} Price per Ounce:</a>
                                </td>
                                <td>
                                    {formatPrice(parseFloat(this.state.gold).toLocaleString())}
                                </td>
                                <td className={this.state.val >= 0 ? "green" : "red"}>
                                    {formatPrice(
                                        this.state.val >= 0
                                            ? "+" + this.state.val
                                            : this.state.val
                                    )}
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <a href={gramUrl}>{metal} Price per Gram:</a>
                                </td>
                                <td>{formatPrice(parseFloat(gram).toLocaleString())}</td>
                                <td className={diffGram >= 0 ? "green" : "red"}>
                                    {formatPrice(diffGram >= 0 ? "+" + diffGram : diffGram)}
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <a href={kiloUrl}>{metal} Price per Kilo:</a>
                                </td>
                                <td>{formatPrice(parseFloat(kg).toLocaleString())}</td>
                                <td className={diffKg >= 0 ? "green" : "red"}>
                                    {formatPrice(diffKg >= 0 ? "+" + diffKg : diffKg)}
                                </td>
                            </tr>
                            </tbody>
                            <tfoot>
                            <tr>
                                <td colSpan="3" className="text-center">
                                    <div id="gpxTickTab_date">{this.state.time} time</div>
                                </td>
                            </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
        );
    }
}

export default PriceOfGold;
