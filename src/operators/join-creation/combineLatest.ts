import { Observable, Subscriber, Subscription } from "../../Observable";

function combineLatest ( sourceObservables: Observable<any>[] ): Observable<any[]> {
    if ( sourceObservables.length === 0 ) return new Observable<never>(( subscriber: Subscriber<never>) => subscriber.complete());
    return new Observable(( subsciber: Subscriber<any> ) => {

        let nextCountSet = new Set();
        const latestValues = new Array(sourceObservables.length);
        let completeCount = 0;

        const subscriptions: Subscription[] = [];

        function unsubscribeAll () {
            if ( subscriptions.length > 0 ) {
                subscriptions.forEach(subscription => subscription.unsubscribe());
            }
        }
        
        for ( let i = 0; i < sourceObservables.length; i++ ) {
            const subscription = sourceObservables[i].subscribe({
                next( value: any ) {
                    nextCountSet.add(i);
                    latestValues[i] = value;
                    if ( nextCountSet.size === sourceObservables.length ) {
                        subsciber.next(latestValues);
                    }
                },
                error( err: any ) {
                    unsubscribeAll();
                    subsciber.error(err);
                },
                complete() {
                    if ( nextCountSet.size < sourceObservables.length ) {
                        unsubscribeAll();
                        subsciber.complete();
                    } else if ( ++completeCount === sourceObservables.length ) {
                        unsubscribeAll();
                        subsciber.complete();
                    }
                }
            });

            subscriptions.push(subscription);
        }

        return unsubscribeAll;
    });
}