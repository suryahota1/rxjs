# rxjs
Clone implementation for rxjs

What are observables
-> Observables are a way to push multiple values over a period of time to the requesting entity. It is a push mechanism of data retrieval.

            Single       Multiple

Push        Promise      Observable

Pull        Function     Iterator

-> Push and pull are two mechanisms of retrieving data and they depnd on the role of Producer and Consumer in the data retrieval process. 
-> In pull system, consumer is active whereas producer is passive. Consumer takes the lead and decides when to retrieve data. Producer is unaware of when it will get called, but when called produces data.
-> In push system, producer is active whereas consumer is passive. Producer decides when to produce data and pushes data into the consumer. Consumer takes action when it reeives data.


