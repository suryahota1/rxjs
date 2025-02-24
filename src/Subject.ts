import { Observable, Observer, Subscriber, TearDownLogic } from "./Observable";

interface SubscriptionLike {
    unsubscribe(): void;
    closed: boolean
};

export class Subject<T> extends Observable<T> implements SubscriptionLike {

    closed: boolean;
    private observerMap: Map<number, Observer<T>>;
    private observableCount: number;

    private errorRef: any;
    private isComplete: boolean;

    constructor () {
        super();
        this.observerMap = new Map();
        this.observableCount = 0;
    }

    protected clearObservers (): void {
        this.observerMap.clear();
    }

    next( value: T ) {
        if ( this.observerMap.size > 0 ) {
            const values = Array.from(this.observerMap.values());
            for ( let i = 0; i < values.length; i++ ) {
                values[i].next(value);
            }
        }
    }

    error( err: any ) {
        this.closed = true;
        this.errorRef = err;
        if ( this.observerMap.size > 0 ) {
            const values = Array.from(this.observerMap.values());
            for ( let i = 0; i < values.length; i++ ) {
                values[i].error(err);
            }
        }
    }

    complete () {
        this.closed = true;
        if ( this.observerMap.size > 0 ) {
            const values = Array.from(this.observerMap.values());
            for ( let i = 0; i < values.length; i++ ) {
                values[i].complete();
            }
        }
    }

    handleError(): void {

    }

    protected _subscribe(subsciber: Subscriber<any>): TearDownLogic {
        if ( !this.checkFinalizedStatus(subsciber) ) return;
        return this._innerSubscribe(subsciber);
    }

    protected _innerSubscribe ( subsciber: Subscriber<any> ) {
        const id = ++this.observableCount;
        this.observerMap.set(id, subsciber);
        subsciber.add(() => {
            this.observerMap.delete(id);
        });
        return subsciber;
    }

    protected checkFinalizedStatus ( subsciber: Subscriber<any> ): boolean {
        if ( this.errorRef ) {
            subsciber.error(this.errorRef);
            return false;
        }
        if ( this.isComplete ) {
            subsciber.complete();
            return false;
        }
        return true;
    }

    unsubscribe(): void {
        throw new Error("Method not implemented.");
    }
}