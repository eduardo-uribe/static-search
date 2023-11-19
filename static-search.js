class StaticSearch extends HTMLElement {
  // names of all attributes for which the element need change notifications
  static get observedAttributes() {
    return ['data-search-results'];
  }

  constructor() {
    super();

    // default no search results found message
    this.noSearchResultsFoundMessage = this.getAttribute(
      'data-no-search-results-found-message'
    );

    // search provided by message
    this.searchProvidedByMessage = 'Search by staticsearch.com';
  }

  /**
   * connectedCallback
   * Called each time the element is added to the document. The specification recommends that, as far as possible, developers should implement custom element setup in this callback rather than the constructor.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Components/Using_custom_elements#custom_element_lifecycle_callbacks}
   */
  async connectedCallback() {
    // url of the resource we want to fetch
    let url = this.getAttribute('data-resource-url');

    // index search data
    let index = await this.readIndexDB(url);

    // inits & event listeners

    // initialize shadow dom if not already set
    if (this.shadowRoot === null) {
      // shadow root
      let root = this.attachShadow({ mode: 'open' });

      // insert static-search template into shadow dom
      let formTemplate = document.getElementById('static-search-form');
      let formTemplateHTML = formTemplate.content;

      root.append(formTemplateHTML.cloneNode(true));
    }

    // listen to search form submitions
    this.shadowRoot.addEventListener('submit', (event) => {
      // prevent default behavior
      event.preventDefault();

      // search form query
      let query = this.shadowRoot.querySelector('input').value;

      // index data that matches the search query
      let matches = this.searchForMatches(index, query);

      // reassign the <static-search> attribute the matched data
      this.shadowRoot.host.setAttribute(
        'data-search-results',
        JSON.stringify(matches)
      );
    });
  }

  // respond to changes in an attribute's value
  /**
   * attributeChangedCallback
   * callback called whenever an attribute whose name is listed in an element's observedAttributes property is added, modified, removed, or replaced
   * @param {String} name - name of the attribute which changed
   * @param {*} oldValue - the attributes old value
   * @param {*} newValue - the attributes new value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue) {
      let searchResults = JSON.parse(newValue);

      // get any previous search results container
      let previousResults = this.shadowRoot.querySelector('ul');

      // remove any previous search results
      if (previousResults) {
        this.shadowRoot.removeChild(previousResults);
      }

      // create the search results container
      let ul = document.createElement('ul');

      // add search provided by message to search results
      let providedBy = document.createElement('li');
      providedBy.setAttribute('id', 'search-provided-by-message');

      let providedByMessage = document.createElement('a');
      providedByMessage.setAttribute('href', 'https://staticsearch.com');
      providedByMessage.setAttribute('id', 'search-provided-by-message-link');
      providedByMessage.textContent = 'Search by staticsearch.com';

      providedBy.append(providedByMessage);
      ul.append(providedBy);

      // search results content container
      let content = document.createElement('ul');

      // list of results
      let list = searchResults
        .map(function (object) {
          return `<li><a href=${object.url}>${object.title}</a></li>`;
        }, this)
        .join('');

      if (list.length > 0) {
        content.innerHTML = list;
      } else {
        // render no search results found message
        let container = document.createElement('li');
        let message = document.createElement('p');
        message.textContent = `${this.noSearchResultsFoundMessage}`;
        container.append(message);

        content.append(container);
      }

      ul.prepend(content);

      // render search results to the shadow dom
      this.shadowRoot.append(ul);
    }
  }

  searchForMatches(index, query) {
    // store objects whose properties contain the query string
    let matches = index.filter(function (object) {
      for (let property in object) {
        if (object[property].includes(query)) {
          return true;
        }
      }
    });

    return matches;
  }

  async readIndexDB(url) {
    return new Promise(function (resolve, reject) {
      // request to open database
      let openDatabaseRequest = indexedDB.open('staticsearch', 1);

      openDatabaseRequest.onsuccess = function (event) {
        // idbdatabase interface
        let database = event.target.result;
        let transaction = database.transaction('index', 'readonly');
        let store = transaction.objectStore('index');

        // request index object store data
        let request = store.getAll();

        request.onerror = function (event) {
          console.log(event.target.errorCode);
        };

        request.onsuccess = async function (event) {
          // the search index
          let index = event.target.result;
          resolve(index);
        };
      };

      openDatabaseRequest.onupgradeneeded = function (event) {
        // save the idbdatabase interface
        let database = event.target.result;

        // create an object store for this database
        let store = database.createObjectStore('index', {
          autoIncrement: true,
        });

        // use transaction oncomplete to make sure the object store creation is finished before adding data into it
        store.transaction.oncomplete = async function (event) {
          // fetch the index data to store in indexeddb
          let request = await fetch(url);
          let index = await request.json();

          // store values in the newly created object store
          let transaction = database.transaction('index', 'readwrite');
          let store = transaction.objectStore('index');

          // save the index data to the store
          index.forEach(function (object) {
            store.add(object);
          });
        };
      };

      openDatabaseRequest.onerror = function (event) {
        // do something with openDatabaseRequest.errorCode
        // console.error( event.target.errorCode );
        reject(event.target.errorCode);
      };
    });
  }
}

customElements.define('static-search', StaticSearch);
