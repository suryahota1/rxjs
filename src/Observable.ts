export type ExecutionFunction<T> = ( observer: Observer<T> ) => any;

type PartialDemo<T> = {
    [K in keyof T]?: T[K]
}

export interface Observer<T> {
    next(value: T): void;
    error(e: any): void;
    complete(): void;
}

class UnSubscriptionError extends Error {

    constructor ( errors: Error[] ) {
        super(errors.length > 0 ? `${errors.length} errors occured while unsubscribing \n ${errors.map((err, i) => i + " . " + err.message + " \n")}` : "");
        this.name = "UnSubscriptionError";
    }
}

interface SubscriptionLike {
    unsubscribe(): void;
    add(t: TearDownLogic): void;
    remove(t: TearDownLogic): void;
    closed: boolean
}

export type TearDownLogic = SubscriptionLike | (() => void) | void;

export class Subscription implements SubscriptionLike {
    
    closed: boolean;

    private initialTearDownFn: (() => void )| null;
    private finalizerTearDowns: Set<TearDownLogic>;

    constructor ( initialTearDownFn?: (() => void) | null ) {
        this.initialTearDownFn = initialTearDownFn ?? null;
        this.finalizerTearDowns = new Set();
    }

    unsubscribe(): void {
        if ( this.closed ) return;
        this.closed = true;
        const errors: UnSubscriptionError[] = [];
        try {
            if ( this.initialTearDownFn ) {
                if ( typeof this.initialTearDownFn === "function" ) {
                    this.initialTearDownFn();
                }
            }
        } catch ( e ) {
            errors.push(e);
        }
        if ( this.finalizerTearDowns.size > 0 ) {
            this.finalizerTearDowns.forEach(td => {
                try {
                    if ( typeof td === "function" ) {
                        td();
                    } else {
                        td?.unsubscribe();
                    }
                } catch ( e ) {
                    errors.push(e);
                }
            })
        }
    }

    add ( td: TearDownLogic ): void {
        if ( td === this ) return;
        if ( this.closed ) {
            if ( typeof td === "function" ) {
                td();
            } else {
                td?.unsubscribe();
            }
        } else {
            this.finalizerTearDowns.add(td);
            if ( td instanceof Subscription ) {
                td.add(() => {
                    this.finalizerTearDowns.delete(td);
                });
            }
        }
    }
    remove( td: TearDownLogic ): void {
        this.finalizerTearDowns.delete(td);
    }
}

export class Subscriber<T> extends Subscription implements Observer<T> {

    private destination: Observer<T>;
    private isStopped: boolean;

    constructor ( destination?: Subscriber<T> | Partial<Observer<T>> | (() => void) | null ) {
        super();
        this.destination = destination instanceof Subscriber ? destination : createSafeObserver(destination);
    }
    
    next( v: T ) {
        if ( this.isStopped ) {
            // handle this
        } else {
            this.destination.next(v);
        }
    };
    error( err: any ) {
        if ( this.isStopped ) {
            // handle this
        } else {
            this.isStopped = true;
            this.destination.error(err);
        }
    };
    complete() {
        if ( this.isStopped ) {
            // handle this
        } else {
            this.isStopped = true;
            this.destination.complete();
        }
    };

    unsubscribe(): void {
        if ( !this.closed ) {
            this.isStopped = true;
            super.unsubscribe();
        }
    }
    
}

class ConsumerObserver<T> implements Observer<T> {

    partialObserver: Partial<Observer<T>>;

    constructor ( partialObserver: Partial<Observer<T>> ) {
        this.partialObserver = partialObserver;
    }

    next( value: any ): void {
        if ( this.partialObserver.next ) {
            try {
                this.partialObserver.next(value);
            } catch ( e ) {
                this.error(e);
            }
        }
    }
    error( err: any ): void {
        if ( this.partialObserver.error ) {
            try {
                this.partialObserver.error(err);
            } catch ( e ) {
                reportUnHandledError(e);
            }
        } else {
            reportUnHandledError(err);
        }
    }
    complete(): void {
        if ( this.partialObserver.complete ) {
            try {
                this.partialObserver.complete();
            } catch ( e ) {
                this.error(e);
            }
        }
    }
    
}

function createSafeObserver<T> ( destination?: Partial<Observer<T>> | (() => void) | null ): Observer<T> {
    return new ConsumerObserver( !destination || typeof destination === "function" ? { next: destination ?? undefined } : destination);
}

function reportUnHandledError ( e: any ) {
    setTimeout(() => {
        throw(e);
    }, 0);
}

interface Subscribable<T> {
    subscribe( subscriber: Subscriber<T> ): Subscription; 
}

interface IteratorYieldResult<T> {
    done: false;
    value: T;
}

interface IteratorReturnResult<TReturn> {
    done: true;
    value: TReturn;
}

type IteratorResult<T, TReturn=any> = IteratorYieldResult<T> | IteratorReturnResult<TReturn>;

export class Observable<T> implements Subscribable<T> {

    // private _subscribe: ( subscriber: Subscriber<T> ) => TearDownLogic;

    constructor ( subscribe?: ( subscriber: Subscriber<T> ) => TearDownLogic ) {
        if ( subscribe ) {
            this._subscribe = subscribe;
        }
    }

    subscribe( subscriberRef: Subscriber<T> | Partial<Observer<T>> | (() => void) | null ): Subscription {
        const subscriber = subscriberRef instanceof Subscriber ? subscriberRef : new Subscriber<T>(subscriberRef);
        subscriber.add(this._trySubscribe(subscriber));
        return subscriber;
    }

    private _trySubscribe( subscriber: Subscriber<T> ): TearDownLogic {
        try {
            return this._subscribe(subscriber);
        } catch ( e ) {
            throw Error("Error while subscribing");
        }
    }

    protected _subscribe( subsciber: Subscriber<any> ): TearDownLogic {
        return;
    }

    public forEach ( next: ( v: any ) => void ): Promise<void> {
        return new Promise(( resolve, reject ) => {
            const observer = new Subscriber({
                next: ( value: any ) => {
                    next(value);
                },
                error: reject,
                complete: resolve
            });

            this.subscribe(observer);
        });
    }

    [Symbol.asyncIterator](): AsyncGenerator<T, void, void> {

        let subscription: Subscription | undefined;
        let deferreds: [(value: IteratorResult<T>) => void, (reason: any) => void][] = [];
        let values: any[] = [];
        let error: any;
        let isComplete = false;

        function handleError ( err: any ) {
            error = err;
            while ( deferreds.length ) {
                const [, reject] = deferreds.shift()!;
                reject(err);
            }
        }

        function handleComplete () {
            isComplete = true;
            while ( deferreds.length ) {
                const [resolve] = deferreds.shift()!;
                resolve({ value: undefined, done: true });
            }
        }


        return {
            next: (): Promise<IteratorResult<T, any>> => {
                if ( !subscription ) {
                    this.subscribe({
                        next: ( value ) => {
                            if ( deferreds.length > 0 ) {
                                const [resolve] = deferreds.shift()!;
                                resolve({value, done: false});
                            } else {
                                values.push(value);
                            }
                        },
                        error: ( err ) => {
                            handleError(err);
                        },
                        complete: () => {
                            handleComplete();
                        }
                    })
                }
                if ( values.length > 0 ) {
                    return Promise.resolve({ done: false, value: values.shift()});
                }
                if ( isComplete ) {
                    return Promise.resolve({ done: true, value: undefined });
                }
                if ( error ) {
                    return Promise.reject(error);
                }
                return new Promise(( resolve, reject) => {
                    deferreds.push([resolve, reject]);
                });
            },
            return( value: any ): Promise<IteratorResult<T>> {
                subscription?.unsubscribe();
                handleComplete();
                return Promise.resolve({ done: true, value });
            },
            throw: ( err: any ): Promise<IteratorResult<T>> => {
                subscription?.unsubscribe();
                handleError(err);
                return Promise.reject(err);
            },
            [Symbol.asyncIterator]() {
                return this;
            }
        }
    }
}
