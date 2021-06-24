import { cleanStores, getValue } from 'nanostores'
import { jest } from '@jest/globals'

import { createRouter, getPagePath, openPage, redirectPage } from '../index.js'

function listen(): (string | undefined)[] {
  let events: (string | undefined)[] = []
  router.listen(page => {
    events.push(page?.path)
  })
  return events
}

function changePath(path: string): void {
  location.hash = ''
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function createTag(
  parent: HTMLElement,
  tag: string,
  attrs: { [name: string]: string } = {}
): HTMLElement {
  let el = document.createElement(tag)
  for (let name in attrs) {
    el.setAttribute(name, attrs[name])
  }
  parent.appendChild(el)
  return el
}

let router = createRouter<{
  secret: 'id'
  posts: void
  draft: 'type' | 'id'
  post: 'categoryId' | 'id'
  home: void
}>({
  secret: '/[secret]/:id',
  posts: '/posts/',
  draft: [/\/posts\/(draft|new)\/(\d+)/, (type, id) => ({ type, id })],
  post: '/posts/:categoryId/:id',
  home: '/'
})

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanStores(router)
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
})

it('parses current location', () => {
  changePath('/posts/guides/10')
  expect(getValue(router)).toEqual({
    path: '/posts/guides/10',
    route: 'post',
    params: {
      categoryId: 'guides',
      id: '10'
    }
  })
})

it('ignores last slash', () => {
  changePath('/posts/guides/10/')
  expect(getValue(router)).toEqual({
    path: '/posts/guides/10',
    route: 'post',
    params: {
      categoryId: 'guides',
      id: '10'
    }
  })
})

it('processes 404', () => {
  changePath('/posts/guides')
  expect(getValue(router)).toBeUndefined()
})

it('escapes RegExp symbols in routes', () => {
  changePath('/[secret]/9')
  expect(getValue(router)).toEqual({
    path: '/[secret]/9',
    route: 'secret',
    params: {
      id: '9'
    }
  })
})

it('ignores hash and search', () => {
  changePath('/posts/?id=1#top')
  expect(getValue(router)).toEqual({
    path: '/posts',
    route: 'posts',
    params: {}
  })
})

it('ignores case', () => {
  changePath('/POSTS')
  expect(getValue(router)).toEqual({
    path: '/POSTS',
    route: 'posts',
    params: {}
  })
})

it('detects URL changes', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  changePath('/')
  expect(getValue(router)).toEqual({ path: '/', route: 'home', params: {} })
  expect(events).toEqual(['/'])
})

it('unbinds events', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  cleanStores(router)
  changePath('/')
  expect(events).toHaveLength(0)
})

it('ignores the same URL in popstate', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  changePath('/posts/guides/10/')
  expect(events).toHaveLength(0)
})

it('detects clicks', () => {
  changePath('/')
  let events = listen()

  createTag(document.body, 'a', { href: '/posts' }).click()
  expect(getValue(router)).toEqual({
    path: '/posts',
    route: 'posts',
    params: {}
  })
  expect(events).toEqual(['/posts'])
})

it('accepts click on tag inside link', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  createTag(link, 'span').click()
  expect(getValue(router)?.path).toEqual('/posts')
})

it('ignore non-link clicks', () => {
  changePath('/')
  listen()

  createTag(document.body, 'span', { href: '/posts' }).click()
  expect(getValue(router)?.path).toEqual('/')
})

it('ignores special clicks', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  let event = new MouseEvent('click', { bubbles: true, ctrlKey: true })
  link.dispatchEvent(event)

  expect(getValue(router)?.path).toEqual('/')
})

it('ignores other mouse button click', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  let event = new MouseEvent('click', { bubbles: true, button: 2 })
  link.dispatchEvent(event)

  expect(getValue(router)?.path).toEqual('/')
})

it('ignores prevented events', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  let span = createTag(link, 'span')
  span.addEventListener('click', e => {
    e.preventDefault()
  })
  span.click()

  expect(getValue(router)?.path).toEqual('/')
})

it('ignores links with noRouter data attribute', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  link.dataset.noRouter = ''
  let span = createTag(link, 'span')
  span.click()

  expect(getValue(router)?.path).toEqual('/')
})

it('ignores new-tab links', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts', target: '_blank' })
  link.click()

  expect(getValue(router)?.path).toEqual('/')
})

it('ignores external links', () => {
  changePath('/')
  let events = listen()

  let link = createTag(document.body, 'a', { href: 'http://lacalhast/posts' })
  link.click()

  expect(getValue(router)?.path).toEqual('/')
  expect(events).toHaveLength(0)
})

it('ignores the same URL in link', () => {
  changePath('/posts')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  link.click()

  expect(events).toHaveLength(0)
})

it('respects data-ignore-router', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  link.setAttribute('data-no-router', '1')
  link.click()

  expect(getValue(router)?.path).toEqual('/')
})

it('respects external rel', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', {
    href: '/posts',
    rel: 'external'
  })
  link.click()

  expect(getValue(router)?.path).toEqual('/')
})

it('respects download attribute', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', {
    href: '/posts',
    download: 'a.txt'
  })
  link.click()

  expect(getValue(router)?.path).toEqual('/')
})

it('opens URLs manually', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  router.open('/posts/')
  expect(location.href).toEqual('http://localhost/posts/')
  expect(getValue(router)).toEqual({
    path: '/posts',
    route: 'posts',
    params: {}
  })
  expect(events).toEqual(['/posts'])
})

it('ignores the same URL in manual URL', () => {
  changePath('/posts/guides/10')
  let events = listen()

  router.open('/posts/guides/10')
  expect(events).toEqual([])
})

it('allows RegExp routes', () => {
  changePath('/posts/draft/10/')
  expect(getValue(router)).toEqual({
    path: '/posts/draft/10',
    route: 'draft',
    params: { type: 'draft', id: '10' }
  })
})

it('generates URLs', () => {
  expect(getPagePath(router, 'home')).toEqual('/')
  expect(getPagePath(router, 'posts')).toEqual('/posts')
  expect(
    getPagePath(router, 'post', { categoryId: 'guides', id: '1' })
  ).toEqual('/posts/guides/1')
})

it('opens URLs manually by route name, pushing new stare', () => {
  let start = history.length
  changePath('/')
  listen()
  openPage(router, 'post', { categoryId: 'guides', id: '10' })
  expect(history.length - start).toEqual(2)

  expect(location.href).toEqual('http://localhost/posts/guides/10')
  expect(getValue(router)).toEqual({
    path: '/posts/guides/10',
    route: 'post',
    params: {
      categoryId: 'guides',
      id: '10'
    }
  })
})

it('opens URLs manually by route name, replacing state', () => {
  let start = history.length
  changePath('/')
  listen()
  redirectPage(router, 'post', { categoryId: 'guides', id: '10' })
  expect(history.length - start).toEqual(1)

  expect(location.href).toEqual('http://localhost/posts/guides/10')
  expect(getValue(router)).toEqual({
    path: '/posts/guides/10',
    route: 'post',
    params: {
      categoryId: 'guides',
      id: '10'
    }
  })
})

it('throws on openning RegExp router', () => {
  expect(() => {
    expect(getPagePath(router, 'draft', { type: 'new', id: '1' })).toEqual('/')
  }).toThrow('RegExp routes are not supported')
})

it('supports link with hash in URL with same path', () => {
  changePath('/posts')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts#hash' })
  link.click()

  expect(location.hash).toEqual('#hash')
  expect(events).toHaveLength(0)
})

it('supports link with hash in URL and different path', () => {
  changePath('/')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts?q=1#hash' })
  link.click()

  expect(location.hash).toEqual('#hash')
  expect(events).toEqual(['/posts'])
})

it('generates artificial hashchange event for empty hash', () => {
  changePath('/#hash')
  let events = listen()

  let hashChangeCalled = 0
  let onHashChange = (): void => {
    hashChangeCalled += 1
  }
  window.addEventListener('hashchange', onHashChange)
  let link = createTag(document.body, 'a', { href: '/' })
  link.click()

  window.removeEventListener('hashchange', onHashChange)
  expect(location.hash).toEqual('')
  expect(events).toHaveLength(0)
  expect(hashChangeCalled).toEqual(1)
})
