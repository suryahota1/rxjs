import { Observable, Subscriber, Subscription } from "../../Observable";

function catchError<T> ( selector: ( err: any, source: Observable<T>) => Observable<T>) {
    return ( sourceObservable: Observable<T> ): Observable<T> => {
        return new Observable(( subscriber: Subscriber<T> ) => {

            let sourceSubscription: Subscription | undefined;
            let outerSubscription: Subscription | undefined;

            sourceSubscription = sourceObservable.subscribe({
                next( value: T) {
                    subscriber.next(value);
                },
                error( err: any ) {
                    if ( sourceSubscription ) {
                        sourceSubscription.unsubscribe();
                    }
                    const newObservable = selector(err, sourceObservable);
                    outerSubscription = catchError(selector)(newObservable).subscribe(subscriber);
                },
                complete() {
                    subscriber.complete();
                }
            })

            return () => {
                sourceSubscription?.unsubscribe();
            }
        });
    }
}