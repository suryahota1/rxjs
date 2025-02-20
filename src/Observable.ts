export type ExecutionFunction = ( observer: Observer ) => any;

type PartialDemo<T> = {
    [K in keyof T]?: T[K]
}

export interface Observer {
    next(v: any): void;
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

type TearDownLogic = SubscriptionLike | (() => void);

class Subscription implements SubscriptionLike {
    
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
                        td.unsubscribe();
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
                td.unsubscribe();
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

class Subscriber extends Subscription implements Observer {

    private destination: Observer;
    private isStopped: boolean;

    constructor ( destination?: Subscriber | Partial<Observer> | (() => void) | null ) {
        super();
        this.destination = destination instanceof Subscriber ? destination : createSafeObserver(destination);
    }
    
    next( v: any ) {
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

class ConsumerObserver implements Observer {

    partialObserver: Partial<Observer>;

    constructor ( partialObserver: Partial<Observer> ) {
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

function createSafeObserver ( destination?: Partial<Observer> | (() => void) | null ): Observer {
    return new ConsumerObserver( !destination || typeof destination === "function" ? { next: destination ?? undefined } : destination);
}

function reportUnHandledError ( e: any ) {
    setTimeout(() => {
        throw(e);
    }, 0);
}
