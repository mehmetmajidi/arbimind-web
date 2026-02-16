export interface OHLCVCandle {
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
}

export interface PredictionData {
    predicted_price: number;
    current_price: number;
    horizon: string;
    confidence: number;
    uncertainty: number;
    price_change_percent: number;
    upper_bound: number;
    lower_bound: number;
}
