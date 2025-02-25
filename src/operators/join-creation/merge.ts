// Receives multiple source observables and emits whenever it gets a value from any of the input observables to the
// output observable. Thereby merging multiple source observables into one output observables. The output observable completes when all of its 
// source observable complete

import { Observable, Subscriber, Subscription } from "../../Observable";

function merge () {
    return function ( ...observables: Observable<any>[] ): Observable<any> {
        return new Observable(( subscriber: Subscriber<any> ) => {
            if ( observables.length === 0 ) {
                subscriber.complete();
            }

            let subscriptions;

            function checkSubscriptions () {
                if ( subscriptions.length === 0 ) {
                    subscriber.complete();
                }
            }

            function unsubscribeAll () {
                subscriptions.forEach(([index, value]) => {
                    (value as Subscription).unsubscribe();
                })
            }


            try {
                subscriptions = observables.map((observable, index) => [index, observable.subscribe({
                    next( v: any ) {
                        subscriber.next(v);
                    },
                    error( e: any ) {
                        unsubscribeAll();
                        subscriber.error(e);
                    },
                    complete() {
                        delete subscriptions[index];
                        checkSubscriptions();
                    }
                })]);
            } catch ( e ) {
                subscriber.error(e);
            }

            return () => {
                unsubscribeAll();
            };
        });
    }
}