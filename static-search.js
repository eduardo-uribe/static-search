class StaticSearch extends HTMLElement {
  static get observedAttributes() {
    return ['data-search-results'];
  }

  constructor() {
    super();

    // properties
    this.url = this.getAttribute('search-index-url');

    // event listeners
    this.addEventListener('submit', this.handleSubmit);
    this.addEventListener('click', this.handleClick);
  }

  /**
   * attributeChangedCallback
   * callback called whenever an attribute whose name is listed in an element's
   * observedAttributes property is added, modified, removed, or replaced
   * @param { String } name - name of the attribute which changed
   * @param { String } oldValue - the attributes old value
   * @param { String } newValue - the attributes new value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === '') return;

    // render search results
    this.renderSearchResults(newValue);
  }

  search(index, query) {
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

  async handleSubmit(event) {
    // prevent default behavior
    event.preventDefault();

    // search form query
    let query = this.querySelector('[data-search-input]').value;

    // search index
    const index = await this.readIndexDB(this.url);

    // index data that matches the search query
    let matches = this.search(index, query);

    // reassign the value of data-search-results attribute
    this.setAttribute('data-search-results', JSON.stringify(matches));
  }

  handleClick(event) {
    const dialog = this.querySelector('dialog');

    if (event.target.matches('[data-close-modal]')) {
      // close dialog model
      dialog.close();
    }

    if (event.target.closest('[data-search-proxy]')) {
      // open dialog model
      dialog.showModal();
    }
  }

  renderSearchResults(newValue) {
    // parse json string
    let searchResults = JSON.parse(newValue);

    // get any previous search results container
    let previousSearchResults = this.querySelector('ul');

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
      const message = `<li><p>No search results found.</p></li>`;
      content.innerHTML = message;
    }

    ul.prepend(content);

    // render search results to the shadow dom
    this.querySelector('[data-search]').append(ul);
  }

  listItemTemplate(object) {
    return `<li><a href=${object.url}>${object.title}</a></li>`;
  }
}

customElements.define('static-search', StaticSearch);
