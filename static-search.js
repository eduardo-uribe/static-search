class StaticSearch extends HTMLElement {
  static get observedAttributes() {
    return ['data-search-results'];
  }

  constructor() {
    super();

    // RELOCATE THIS OR REMOVE?
    // default message for no search results found
    this.noSearchResultsFoundMessage = this.getAttribute(
      'data-no-search-results-message'
    )
      ? this.getAttribute('data-no-search-results-message')
      : 'No search results found.';

    // attach shadow
    this.attachShadow({ mode: 'open' });

    // event listeners
    this.shadowRoot.addEventListener('submit', this.formHandler);
    this.shadowRoot.addEventListener('click', this.handleClick);
  }

  /**
   * connectedCallback
   */
  async connectedCallback() {
    // static-search html template
    const html = document
      .querySelector('[data-static-search]')
      .content.cloneNode(true);

    // append template content into the shadow dom
    this.shadowRoot.append(html);
  }

  /**
   * attributeChangedCallback
   * callback called whenever an attribute whose name is listed in an element's observedAttributes property is added, modified, removed, or replaced
   * @param {String} name - name of the attribute which changed
   * @param {*} oldValue - the attributes old value
   * @param {*} newValue - the attributes new value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === '') {
      return;
    }

    // render the search results
    this.renderSearchResults(newValue);
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

  formHandler = async (event) => {
    // prevent default behavior
    event.preventDefault();

    // search form query
    let query = this.shadowRoot.querySelector('[data-search-input]').value;

    const url = this.getAttribute('data-resource-url');
    const index = await this.readIndexDB(url);

    // index data that matches the search query
    let matches = this.searchForMatches(index, query);

    // reassign the value of data-search-results attribute
    this.shadowRoot.host.setAttribute(
      'data-search-results',
      JSON.stringify(matches)
    );
  };

  handleClick = (event) => {
    const dialog = this.shadowRoot.querySelector('dialog');

    if (event.target.matches('[data-close-modal]')) {
      // close dialog model
      dialog.close();
    }

    if (event.target.closest('[data-search-proxy]')) {
      // open dialog model
      dialog.showModal();
    }
  };

  renderSearchResults = (newValue) => {
    // parse json string
    let searchResults = JSON.parse(newValue);

    // get any previous search results container
    let previousSearchResults = this.shadowRoot.querySelector('ul');

    // remove any previous search results containers
    if (previousSearchResults) {
      previousSearchResults.remove();
    }

    // container for search results
    let ul = document.createElement('ul');

    // add brancd message to search results
    const searchProvidedBy = `<li id="search-provided-by-message"><a href="https://staticsearch.com" id="search-provided-by-message-link">Search by staticsearch.com</a></li>`;
    ul.innerHTML = searchProvidedBy;

    // search results unordered list
    let content = document.createElement('ul');

    // list of results
    let list = searchResults.map(this.listItemTemplate, this).join('');

    if (list.length > 0) {
      content.innerHTML = list;
    } else {
      // render no search results found message
      const message = `<li><p>${this.noSearchResultsFoundMessage}</p></li>`;
      content.innerHTML = message;
    }

    ul.prepend(content);

    // render search results to the shadow dom
    this.shadowRoot.querySelector('[data-search]').append(ul);
  };

  listItemTemplate(object) {
    return `<li><a href=${object.url}>${object.title}</a></li>`;
  }
}

customElements.define('static-search', StaticSearch);
