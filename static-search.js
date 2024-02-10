class StaticSearch extends HTMLElement {
  static get observedAttributes() {
    return ['data-search-results'];
  }

  constructor() {
    super();

    // properties
    this.url = this.getAttribute('url');
    this.form = this.querySelector('form');
    this.dialog = this.querySelector('dialog');

    // brand message
    this.brand = document.createElement('a');
    this.brand.setAttribute('href', 'https://staticsearch.com');
    this.brand.textContent = 'search provided by staticsearch.com';

    // event listeners
    this.addEventListener('submit', this.handleSubmit);
    this.addEventListener('click', this.handleClick);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === '') return;
    this.render(JSON.parse(newValue));
  }

  search(index, query) {
    const matches = index.filter(function (object) {
      for (let property in object) {
        if (object[property].includes(query)) {
          return true;
        }
      }
    });

    return matches;
  }

  async handleSubmit(event) {
    event.preventDefault();

    try {
      const searchquery = this.querySelector('[data-search-input]').value;
      const searchindex = await this.getIndex(this.url);
      const searchmatches = this.search(searchindex, searchquery);

      this.setAttribute('data-search-results', JSON.stringify(searchmatches));
    } catch (error) {
      console.log(error);
    }
  }

  handleClick(event) {
    if (event.target.matches('[data-close-modal]')) {
      this.dialog.close();
      this.form.reset();

      // remove any search results
      if (this.querySelector('ul')) this.querySelector('ul').remove();
      if (this.querySelector('a')) this.querySelector('a').remove();
    }

    if (event.target.closest('[data-search-proxy]')) {
      this.dialog.showModal();
    }
  }

  async getIndex(url) {
    return new Promise(function (resolve, reject) {
      const opendatabase = indexedDB.open('TestDatabase', 1);

      opendatabase.onerror = function (event) {
        reject(event.target.errorCode);
      };

      opendatabase.onsuccess = function (event) {
        const database = event.target.result;

        // catch all error handler
        database.onerror = function (event) {
          console.log(`database error: ${event.target.errorCode}`);
        };

        const transaction = database.transaction(['index']);
        const store = transaction.objectStore('index');
        const indexrequest = store.getAll();

        indexrequest.onsuccess = function (event) {
          const index = event.target.result;
          resolve(index);
        };
      };

      opendatabase.onupgradeneeded = function (event) {
        // indexdb database interface
        const database = event.target.result;

        // create indexdb store
        const store = database.createObjectStore('index', {
          autoIncrement: true,
        });

        // add data to the store
        store.transaction.oncomplete = async function (event) {
          const request = await fetch(url);
          const searchdata = await request.json();

          const index = database
            .transaction('index', 'readwrite')
            .objectStore('index');

          searchdata.forEach(function (object) {
            index.add(object);
          });
        };
      };
    });
  }

  render(matches) {
    // remove any previous search results
    if (this.querySelector('ul')) this.querySelector('ul').remove();
    if (this.querySelector('a')) this.querySelector('a').remove();

    // new search results container
    const searchresults = document.createElement('ul');
    const listitems = matches.map(this.template, this).join('');

    if (listitems.length === 0) {
      searchresults.innerHTML = `<li><p>No search results found.</p></li>`;
    } else {
      searchresults.innerHTML = listitems;
    }

    // render search results
    this.querySelector('[data-search]').append(searchresults, this.brand);
  }

  template(object) {
    return `<li><a href=${object.url}>${object.title}</a></li>`;
  }
}

customElements.define('static-search', StaticSearch);
