// A custom operator which emits values after a given value of delay.

import { Observable, Subscriber } from "../Observable";

function delay ( millis: number ): Function {
    return function<T> ( sourceObservable: Observable<T> ): Observable<T> {
        return new Observable<T>(( subscriber: Subscriber<T> ) => {

            const timerIdSet = new Set();
            let sourceError: any;
            let sourceComplete = false;

            function clearTimers () {
                if ( timerIdSet.size > 0 ) {
                    timerIdSet.forEach(( key, value ) => {
                        clearTimeout(value as number);
                    });
                    timerIdSet.clear();
                }
            }

            const sourceSubscription = sourceObservable.subscribe({
                next( value: T ) {
                    const timerId = setTimeout(() => {
                            subscriber.next(value);
                            timerIdSet.delete(timerId);
                            if ( timerIdSet.size === 0 ) {
                                if ( sourceComplete ) {
                                    subscriber.complete();
                                } else if ( sourceError ) {
                                    subscriber.error(sourceError);
                                }
                            }
                            
                    }, millis);
                    timerIdSet.add(timerId);
                },
                error( err: any ) {
                    sourceError = err;
                    if ( timerIdSet.size === 0 ) {
                        subscriber.error(sourceError);
                    }
                },
                complete() {
                    sourceComplete = true;
                    if ( timerIdSet.size === 0 ) {
                        subscriber.complete();
                    }
                }
            });

            // The cleanup logic
            return () => {
                sourceSubscription.unsubscribe();
                clearTimers();
            }
        });
    }
}