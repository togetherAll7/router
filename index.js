import { atom, onMount } from 'nanostores'

export function createRouter(routes) {
  let router = atom()
  router.routes = Object.keys(routes).map(name => {
    let value = routes[name]
    if (typeof value === 'string') {
      value = value.replace(/\/$/g, '') || '/'
      let names = (value.match(/\/:\w+/g) || []).map(i => i.slice(2))
      let pattern = value
        .replace(/[\s!#$()+,.:<=?[\\\]^{|}]/g, '\\$&')
        .replace(/\/\\:\w+\\\?/g, '/?([^/]*)')
        .replace(/\/\\:\w+/g, '/([^/]+)')
      return [
        name,
        RegExp('^' + pattern + '$', 'i'),
        (...matches) =>
          matches.reduce((params, match, index) => {
            params[names[index]] = match
            return params
          }, {}),
        value
      ]
    } else {
      return [name, ...value]
    }
  })

  let prev
  let parse = path => {
    path = path.split('?')[0].replace(/\/$/, '') || '/'
    if (prev === path) return false
    prev = path

    for (let [route, pattern, cb] of router.routes) {
      let match = path.match(pattern)
      if (match) {
        return { path, route, params: cb(...match.slice(1)) }
      }
    }
  }

  let click = event => {
    let link = event.target.closest('a')
    if (
      !event.defaultPrevented &&
      link &&
      event.button === 0 &&
      link.target !== '_blank' &&
      link.dataset.noRouter == null &&
      link.rel !== 'external' &&
      !link.download &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      let url = new URL(link.href)
      if (url.origin === location.origin) {
        event.preventDefault()
        let changed = location.hash !== url.hash
        router.open(url.pathname + url.search)
        if (changed) {
          location.hash = url.hash
          if (url.hash === '' || url.hash === '#') {
            window.dispatchEvent(new HashChangeEvent('hashchange'))
          }
        }
      }
    }
  }

  let set = router.set
  if (process.env.NODE_ENV !== 'production') {
    delete router.set
  }

  let popstate = () => {
    let page = parse(location.pathname)
    if (page !== false) set(page)
  }

  if (typeof window !== 'undefined' && typeof location !== 'undefined') {
    onMount(router, () => {
      let page = parse(location.pathname)
      if (page !== false) set(page)
      document.body.addEventListener('click', click)
      window.addEventListener('popstate', popstate)
      return () => {
        prev = undefined
        document.body.removeEventListener('click', click)
        window.removeEventListener('popstate', popstate)
      }
    })
  } else {
    set(parse('/'))
  }

  router.open = (path, redirect) => {
    let page = parse(path)
    if (page !== false) {
      if (typeof history !== 'undefined') {
        if (redirect) {
          history.replaceState(null, null, path)
        } else {
          history.pushState(null, null, path)
        }
      }
      set(page)
    }
  }

  return router
}

export function getPagePath(router, name, params) {
  let route = router.routes.find(i => i[0] === name)
  if (process.env.NODE_ENV !== 'production') {
    if (!route[3]) throw new Error('RegExp routes are not supported')
  }
  return route[3]
    .replace(/\/:\w+\?/g, i => {
      let param = params[i.slice(2).slice(0, -1)]
      return (param ? '/' : '') + param
    })
    .replace(/\/:\w+/g, i => '/' + params[i.slice(2)])
}

export function openPage(router, name, params) {
  router.open(getPagePath(router, name, params))
}

export function redirectPage(router, name, params) {
  router.open(getPagePath(router, name, params), true)
}
