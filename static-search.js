class StaticSearch extends HTMLElement {

    // public class fields:
    logo = `<li id="static-search-results-logo">search by <a href="https://staticsearch.com" id="static-search-results-logo-link">staticsearch.com</a>.</li>`;

    // initialize this variable in the connectedCallback() method
    noSearchResultsFoundMessage = `<li><p>Sorry, no search results found.</p></li>`;

    static get observedAttributes() { 
        return [ "data-search-results" ];
    }

    constructor() {
        super();
    }

    connectedCallback() {

        // url of resource we want to fetch
        let url = this.getAttribute( "data-resource-url" );


        // inits & event listeners
        // initialize shadow dom
        if ( !this.shadowRoot ) {

            // shadow root
            let root = this.attachShadow( { mode: "open" } );

            // insert static-search template into shadow dom
            let formTemplate = document.getElementById("static-search-form");
            let formTemplateHTML = formTemplate.content;


            root.append( formTemplateHTML.cloneNode( true ) );
        }


        // question-to-oneself: @FIXME:
        // should i store index data to indexeddb on class connectedCallback() invocation.
        // instead of waiting to a submit event is fired.
        // yes - refactor this process code.

        this.shadowRoot.addEventListener( "submit", async ( event ) => {

            event.preventDefault();

            // variables
            let root = this.shadowRoot;

            // get the data to search

            // get the data from indexeddb - basic pattern
            // 1. open a database
            let openDatabaseRequest = indexedDB.open( "staticsearch", 1 );
            

            openDatabaseRequest.onerror = function( event ) {
                // do something with openDatabaseRequest.errorCode
                console.error( event.target.errorCode );
            };

            openDatabaseRequest.onsuccess = function( event ) {
                
                // idbdatabase interface
                let database = event.target.result;
                let transaction = database.transaction( "index", "readonly" );
                let store = transaction.objectStore( "index" );

                // request index object store data
                let request = store.getAll();

                request.onerror = function( event ) {

                    console.log( event.target.errorCode );
                };

                request.onsuccess = function( event ) {

                    // search index data
                    let index = event.target.result;

                    // run search

                    // search query
                    let query = root.querySelector( "input" ).value;

                    // objects whose properties contain the query string
                    let matches = index.filter( function( object ) {

                        for ( let property in object ) {

                            if ( object[property].includes( query ) ) {
                                return true;
                            }

                        }

                    });

                    // update the <static-search> attribute with the matches data
                    root.host.setAttribute( "data-search-results", JSON.stringify( matches ) );
                }

            };

            openDatabaseRequest.onupgradeneeded = async function( event ) {
                
                // save the idbdatabase interface
                let database = event.target.result;

                // create an object store for this database
                let store = database.createObjectStore( "index", { autoIncrement: true } );

                // use transaction oncomplete to make sure the object store creation is finished before adding data into it
                store.transaction.oncomplete = async function( event ) {

                    // fetch the index data to store in indexeddb
                    let request = await fetch( url );
                    let index = await request.json();

                    // store values in the newly created object store
                    let transaction = database.transaction( "index", "readwrite" );
                    let store = transaction.objectStore( "index" );

                    // save the index data to the store
                    index.forEach( function( object ) {
                        store.add( object );
                    });
                };
            };            

        });

    }

    attributeChangedCallback( name, oldValue, newValue ) {


        if ( newValue ) {


            let searchResults = JSON.parse( newValue );


            // get any previous search results container
            let previousResults = this.shadowRoot.querySelector( "ul" );

            // remove any previous search results
            if ( previousResults ) {

                this.shadowRoot.removeChild( previousResults );

            }


            // create the search results container
            let ul = document.createElement( "ul" );


            // add static-search logo to search results
            ul.innerHTML =  this.logo;


            // create the search results content container
            let content = document.createElement( "ul" );

            // results list content
            let list = searchResults.map( function( object ) {

                return `<li><a href=${ object.url }>${ object.title }</a></li>`;;

            }, this ).join("");


            // create no search results found content
            if ( list.length > 0 ) {

                content.innerHTML = list;

            } else {

                content.innerHTML = this.noSearchResultsFoundMessage;

            }

            ul.prepend( content );

            
            // add search results container to the shadow dom
            this.shadowRoot.append( ul );

        }

    }

}

customElements.define( "static-search", StaticSearch );