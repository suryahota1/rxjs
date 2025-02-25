import { Observable, Subscriber } from "../../Observable";

export function timer ( millis: number ) {
    return function<T> (): Observable<T> {
        return new Observable<T> (( subscriber: Subscriber<T> ) => {
            let timerId = setTimeout(() => {
                timerId = 0;
                subscriber.next(0);
                subscriber.complete();
            });

            return () => {
                if ( timerId ) {
                    clearTimeout(timerId);
                }
            }
        });
    }
}