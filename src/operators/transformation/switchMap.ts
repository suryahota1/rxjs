import { Observable, Subscriber, Subscription } from "../../Observable";

function switchMap<T> ( mappingFunction: (value: T) => Observable<T>) {
    return ( sourceObservable: Observable<T> ): Observable<T> => {
        return new Observable(( subscriber: Subscriber<T> ) => {

            let innerSubscription: Subscription;

            const sourceSubscription = sourceObservable.subscribe({
                next( value: T ) {
                    if ( innerSubscription ) innerSubscription.unsubscribe();
                    const newObservable = mappingFunction(value);
                    innerSubscription = newObservable.subscribe(subscriber);
                },
                error( err: any ) {
                    
                },
                complete() {
                    
                }
            });

            return () => {
                sourceSubscription.unsubscribe();
                if ( innerSubscription ) {
                    innerSubscription.unsubscribe();
                }
            }
        });
    }
}