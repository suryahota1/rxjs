import { Observable, Subscriber } from "../../Observable";

function generate<T> ( initialValue: T, condition: (v: T) => boolean, nextValue: (v: T) => T ): Observable<T> {
    return new Observable(( subscriber: Subscriber<T> ) => {
        try {
            // This can not be a loop here as we may have to unsubscribe also

            // for ( let i = initialValue; condition(i); nextValue(i) ) {
            //     subscriber.next(i);
            // }
        } catch ( e ) {
            subscriber.error(e);
        } finally {
            subscriber.complete();
        }

        return () => {

        }
    });
}