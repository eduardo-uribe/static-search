class StaticSearch extends HTMLElement {

    static get observedAttributes() { 
        return [ "data-search-results" ];
    }

    constructor() {
        super();

        this.noSearchResultsFoundMessage =  this.getAttribute( "data-no-search-results-found-message" );

        this.searchProvidedByMessage = "Search provided by staticsearch.com";
    }

    connectedCallback() {

        // url of resource we want to fetch
        let url = this.getAttribute( "data-resource-url" );


        // inits & event listeners

        // initialize shadow dom if not already set
        if ( this.shadowRoot === null ) {

            // shadow root
            let root = this.attachShadow( { mode: "open" } );

            // insert static-search template into shadow dom
            let formTemplate = document.getElementById("static-search-form");
            let formTemplateHTML = formTemplate.content;


            root.append( formTemplateHTML.cloneNode( true ) );
        }

        this.shadowRoot.addEventListener( "submit", async ( event ) => {

            event.preventDefault();

            // variables
            let root = this.shadowRoot;

            // get search index from indexed db
            // request to open database
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

                    // the search index
                    let index = event.target.result;

                    // run search

                    // search query
                    let query = root.querySelector( "input" ).value;

                    // store objects whose properties contain the query string
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


            // add search provided by message to search results
            let providedBy = document.createElement( "li" );
            providedBy.setAttribute( "id", "search-provided-by-message" );

            let providedByMessage = document.createElement( "a" );
            providedByMessage.setAttribute( "href", "https://staticsearch.com" );
            providedByMessage.setAttribute( "id", "search-provided-by-message-link" );
            providedByMessage.textContent = "Search provided by staticsearch.com";

            providedBy.append( providedByMessage );
            ul.append( providedBy );


            // search results content container
            let content = document.createElement( "ul" );

            // list of results
            let list = searchResults.map( function( object ) {

                return `<li><a href=${ object.url }>${ object.title }</a></li>`;;

            }, this ).join("");

            if ( list.length > 0 ) {
                content.innerHTML = list;
            } else {

                // render no search results found message
                let container = document.createElement( "li" );
                let message = document.createElement( "p" );
                message.textContent = `${ this.noSearchResultsFoundMessage }`;
                container.append(message);

                content.append( container );
            }

            ul.prepend( content );

            
            // render search results to the shadow dom
            this.shadowRoot.append( ul );

        }

    }

}

customElements.define( "static-search", StaticSearch );