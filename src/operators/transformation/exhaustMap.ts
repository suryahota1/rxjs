import { Observable, Subscriber, Subscription } from "../../Observable";

export function exhaustMap<T> ( innerFunction: ( value: T, index: number ) => Observable<T>) {
    return ( sourceObservable: Observable<T> ): Observable<T> => {
        return new Observable(( subscriber: Subscriber<T> ) => {

            let innerSubscription: Subscription | undefined;
            let outerIndex = 0;
            let sourceComplete = false;

            const sourceSubscription = sourceObservable.subscribe({
                next( value: T ) {
                    if ( innerSubscription !== undefined ) return;
                    innerSubscription = innerFunction(value, outerIndex).subscribe({
                        next( outerValue: T ) {
                            subscriber.next(outerValue);
                        },
                        error( err: any) {
                            sourceSubscription?.unsubscribe();
                            subscriber.error(err);
                        },
                        complete() {
                            innerSubscription = undefined;
                            if ( sourceComplete ) {
                                subscriber.complete();
                            }
                        }
                    });
                },
                error( err: any ) {

                },
                complete() {
                    sourceComplete = true;
                }
            });

            return () => {
                sourceSubscription?.unsubscribe();
                innerSubscription?.unsubscribe();
            }
        });
    }
}