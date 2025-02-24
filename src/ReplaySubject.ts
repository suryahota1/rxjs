import { Subscriber, TearDownLogic } from "./Observable";
import { Subject } from "./Subject";

interface TimedValue<T> {
    value: T,
    timestamp: number
}

class ReplaySubject<T> extends Subject<T> {

    private values: TimedValue<T>[];
    private bufferSize: number;
    private windowPeriod: number;

    constructor ( bufferSize?: number, windowPeriod?: number ) {
        super();
        if ( bufferSize === undefined ) {
            this.bufferSize = Number.MAX_SAFE_INTEGER;
        }
        if ( windowPeriod === undefined ) {
            this.windowPeriod = Number.MAX_SAFE_INTEGER;
        }
        this.values = [];
    }

    next( value: T ) {
        super.next(value);
        this._insertIntoValues(value);
    }

    protected _subscribe(subsciber: Subscriber<any>): TearDownLogic {
        const subscription = super._subscribe(subsciber)
        if ( this.values.length ) {
            this.values.forEach(value => subsciber.next(value.value));
        }
        return subscription;
    }

    private _insertIntoValues ( value: T ) {
        if ( this.values.length === this.bufferSize ) this.values.shift();
        this.values.push({ value, timestamp: Date.now() });
        let currTimestamp = Date.now();
        let initialTimestamp = this.values[0].timestamp;
        while ( initialTimestamp && currTimestamp - initialTimestamp >= this.windowPeriod ) {
            this.values.shift();
            initialTimestamp = this.values[0]?.timestamp;
        }
    }
}