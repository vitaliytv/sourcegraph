import assert from 'assert'

import expect from 'expect'

import { Driver, createDriverForTest } from '@sourcegraph/shared/src/testing/driver'
import { afterEachSaveScreenshotIfFailed } from '@sourcegraph/shared/src/testing/screenshotReporter'

import { SearchResult } from '../graphql-operations'

import { WebIntegrationTestContext, createWebIntegrationTestContext } from './context'
import { commonWebGraphQlResults } from './graphQlResults'
import { siteID, siteGQLID } from './jscontext'

describe('Search onboarding', () => {
    let driver: Driver
    before(async () => {
        driver = await createDriverForTest()
    })
    after(() => driver?.close())
    let testContext: WebIntegrationTestContext
    beforeEach(async function () {
        testContext = await createWebIntegrationTestContext({
            driver,
            currentTest: this.currentTest!,
            directory: __dirname,
        })
        testContext.overrideGraphQL({
            ...commonWebGraphQlResults,
            SearchSuggestions: () => ({
                search: {
                    suggestions: [{ __typename: 'Repository', name: '^github\\.com/sourcegraph/sourcegraph$' }],
                },
            }),
            Search: (): SearchResult => ({
                search: {
                    results: {
                        __typename: 'SearchResults',
                        limitHit: true,
                        matchCount: 30,
                        approximateResultCount: '30+',
                        missing: [],
                        cloning: [],
                        repositoriesCount: 372,
                        timedout: [],
                        indexUnavailable: false,
                        dynamicFilters: [],
                        results: [],
                        alert: null,
                        elapsedMilliseconds: 103,
                    },
                },
            }),
            RepoGroups: () => ({
                repoGroups: [],
            }),
            AutoDefinedSearchContexts: () => ({
                autoDefinedSearchContexts: [],
            }),
            ViewerSettings: () => ({
                viewerSettings: {
                    subjects: [
                        {
                            __typename: 'DefaultSettings',
                            settingsURL: null,
                            viewerCanAdminister: false,
                            latestSettings: {
                                id: 0,
                                contents: JSON.stringify({ experimentalFeatures: { showOnboardingTour: true } }),
                            },
                        },
                        {
                            __typename: 'Site',
                            id: siteGQLID,
                            siteID,
                            latestSettings: {
                                id: 470,
                                contents: JSON.stringify({ experimentalFeatures: { showOnboardingTour: true } }),
                            },
                            settingsURL: '/site-admin/global-settings',
                            viewerCanAdminister: true,
                        },
                    ],
                    final: JSON.stringify({}),
                },
            }),
        })
    })
    afterEachSaveScreenshotIfFailed(() => driver.page)
    afterEach(() => testContext?.dispose())

    const resetOnboardingTour = async () => {
        await driver.page.evaluate(() => {
            localStorage.setItem('has-seen-onboarding-tour', 'false')
            localStorage.setItem('has-cancelled-onboarding-tour', 'false')
            localStorage.setItem('has-completed-onboarding-tour', 'false')
            location.reload()
        })
    }
    const waitAndFocusInput = async () => {
        await driver.page.waitForSelector('.monaco-editor .view-lines')
        await driver.page.click('.monaco-editor .view-lines')
    }

    describe('Onboarding', () => {
        it('only diplay tour after input is focused', async () => {
            await driver.page.goto(driver.sourcegraphBaseUrl + '/search')
            let tourCard = await driver.page.evaluate(() => document.querySelector('.tour-card'))
            expect(tourCard).toBeNull()
            await waitAndFocusInput()
            tourCard = await driver.page.evaluate(() => document.querySelector('.tour-card'))
            expect(tourCard).toBeTruthy()
        })
        it('displays all steps in the language onboarding flow', async () => {
            await driver.page.goto(driver.sourcegraphBaseUrl + '/search')
            await resetOnboardingTour()
            await waitAndFocusInput()
            await driver.page.waitForSelector('.tour-card')
            await driver.page.waitForSelector('.test-tour-language-button')
            await driver.page.click('.test-tour-language-button')
            await driver.page.waitForSelector('#monaco-query-input')
            const inputContents = await driver.page.evaluate(
                () => document.querySelector('#monaco-query-input .view-lines')?.textContent
            )
            assert.strictEqual(inputContents, 'lang:')

            await driver.page.waitForSelector('.test-tour-step-2')
            await driver.page.keyboard.type('typesc')
            await driver.page.waitForSelector('.monaco-query-input-container .suggest-widget.visible')
            await driver.page.keyboard.press('Tab')
            await driver.page.waitForSelector('.test-tour-step-3')
            await driver.page.keyboard.press('Space')
            await driver.page.keyboard.type('test')

            await driver.page.waitForSelector('.test-tour-step-4')
            await driver.page.click('.test-search-button')
            await driver.page.waitForSelector('.test-tour-step-5')
            await driver.page.click('.test-search-help-dropdown-button-icon')
        })

        it('displays all steps in the repo onboarding flow', async () => {
            await driver.page.goto(driver.sourcegraphBaseUrl + '/search')
            await resetOnboardingTour()
            await waitAndFocusInput()
            await driver.page.waitForSelector('.tour-card')
            await driver.page.waitForSelector('.test-tour-repo-button')
            await driver.page.click('.test-tour-repo-button')
            await driver.page.waitForSelector('#monaco-query-input')
            const inputContents = await driver.page.evaluate(
                () => document.querySelector('#monaco-query-input .view-lines')?.textContent
            )
            assert.strictEqual(inputContents, 'repo:')

            await driver.page.waitForSelector('.test-tour-step-2')
            await driver.page.keyboard.type('sourcegraph ')
            await driver.page.waitForSelector('.test-tour-step-3')
            await driver.page.keyboard.type('test')
            await driver.page.waitForSelector('.test-tour-step-4')
            await driver.page.click('.test-search-button')
            await driver.page.waitForSelector('.test-tour-step-5')
            await driver.page.click('.test-search-help-dropdown-button-icon')
        })
        it('advances filter-lang when an autocomplete suggestion is selected', async () => {
            await driver.page.goto(driver.sourcegraphBaseUrl + '/search')
            await resetOnboardingTour()
            await waitAndFocusInput()
            await driver.page.waitForSelector('.tour-card')
            await driver.page.waitForSelector('.test-tour-language-button')
            await driver.page.click('.test-tour-language-button')
            await driver.page.waitForSelector('#monaco-query-input')
            const inputContents = await driver.page.evaluate(
                () => document.querySelector('#monaco-query-input .view-lines')?.textContent
            )
            assert.strictEqual(inputContents, 'lang:')
            await driver.page.waitForSelector('.test-tour-step-2')
            await driver.page.keyboard.type('typescr')
            await driver.page.waitForSelector('.monaco-query-input-container .suggest-widget.visible')
            let tourStep2 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-2'))
            let tourStep3 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-3'))
            expect(tourStep2).toBeTruthy()
            expect(tourStep3).toBeNull()
            await driver.page.keyboard.press('Tab')
            await driver.page.waitForSelector('.test-tour-step-3')
            tourStep3 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-3'))
            tourStep2 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-2'))
            expect(tourStep3).toBeTruthy()
        })

        it('advances filter-lang when there is a valid matching language passed to the lang filter', async () => {
            await driver.page.goto(driver.sourcegraphBaseUrl + '/search')
            await resetOnboardingTour()
            await waitAndFocusInput()
            await driver.page.waitForSelector('.tour-card')
            await driver.page.waitForSelector('.test-tour-language-button')
            await driver.page.click('.test-tour-language-button')
            await driver.page.waitForSelector('#monaco-query-input')
            const inputContents = await driver.page.evaluate(
                () => document.querySelector('#monaco-query-input .view-lines')?.textContent
            )
            assert.strictEqual(inputContents, 'lang:')
            await driver.page.waitForSelector('.test-tour-step-2')
            await driver.page.keyboard.type('typescript')
            await driver.page.keyboard.press('Space')
            await driver.page.waitForSelector('.test-tour-step-3')
            const tourStep3 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-3'))
            expect(tourStep3).toBeTruthy()
        })
        it('advances filter-repository when an autocomplete suggestion is selected', async () => {
            await driver.page.goto(driver.sourcegraphBaseUrl + '/search')
            await resetOnboardingTour()
            await waitAndFocusInput()
            await driver.page.waitForSelector('.tour-card')
            await driver.page.waitForSelector('.test-tour-repo-button')
            await driver.page.click('.test-tour-repo-button')
            await driver.page.waitForSelector('#monaco-query-input')
            const inputContents = await driver.page.evaluate(
                () => document.querySelector('#monaco-query-input .view-lines')?.textContent
            )
            assert.strictEqual(inputContents, 'repo:')
            await driver.page.waitForSelector('.test-tour-step-2')
            await driver.page.keyboard.type('sourcegraph')
            await driver.page.waitForSelector('.monaco-query-input-container .suggest-widget.visible')
            let tourStep2 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-2'))
            let tourStep3 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-3'))
            expect(tourStep2).toBeTruthy()
            expect(tourStep3).toBeNull()
            await driver.page.keyboard.press('Tab')
            await driver.page.waitForSelector('.test-tour-step-3')
            tourStep3 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-3'))
            tourStep2 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-2'))
            expect(tourStep3).toBeTruthy()
        })

        it('advances filter-repository when a user types their own repository', async () => {
            await driver.page.goto(driver.sourcegraphBaseUrl + '/search')
            await resetOnboardingTour()
            await waitAndFocusInput()
            await driver.page.waitForSelector('.tour-card')
            await driver.page.waitForSelector('.test-tour-repo-button')
            await driver.page.click('.test-tour-repo-button')
            await driver.page.waitForSelector('#monaco-query-input')
            const inputContents = await driver.page.evaluate(
                () => document.querySelector('#monaco-query-input .view-lines')?.textContent
            )
            assert.strictEqual(inputContents, 'repo:')
            await driver.page.waitForSelector('.test-tour-step-2')
            await driver.page.keyboard.type('sourcegraph/sourcegraph')
            await driver.page.waitForSelector('.monaco-query-input-container .suggest-widget.visible')
            let tourStep2 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-2'))
            let tourStep3 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-3'))
            expect(tourStep2).toBeTruthy()
            expect(tourStep3).toBeNull()
            await driver.page.keyboard.press('Space')
            await driver.page.waitForSelector('.test-tour-step-3')
            tourStep3 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-3'))
            tourStep2 = await driver.page.evaluate(() => document.querySelector('.test-tour-step-2'))
            expect(tourStep3).toBeTruthy()
        })

        it('Removes onboardingTour query parameter when the query reference step is advanced', async () => {
            await driver.page.goto(
                driver.sourcegraphBaseUrl + '/search?q=lang:go+test&patternType=literal&onboardingTour=true'
            )
            await resetOnboardingTour()
            await waitAndFocusInput()
            await driver.page.waitForSelector('.tour-card')
            await driver.page.waitForSelector('.test-tour-step-5')
            await driver.page.waitForSelector('.search-help-dropdown-button')
            await driver.page.click('.search-help-dropdown-button')
            expect(await driver.page.evaluate(() => document.querySelectorAll('.test-tour-step-5').length)).toBe(0)
            await driver.assertWindowLocation('/search?q=lang%3Ago+test&patternType=literal')
        })

        it('Removes onboardingTour query parameter when the query reference step is cancelled', async () => {
            await driver.page.goto(
                driver.sourcegraphBaseUrl + '/search?q=lang:go+test&patternType=literal&onboardingTour=true'
            )
            await resetOnboardingTour()
            await waitAndFocusInput()
            await driver.page.waitForSelector('.tour-card')
            await driver.page.waitForSelector('.test-tour-step-5')
            await driver.page.waitForSelector('.test-tour-close-button')
            await driver.page.click('.test-tour-close-button')
            expect(await driver.page.evaluate(() => document.querySelectorAll('.test-tour-step-5').length)).toBe(0)
            await driver.assertWindowLocation('/search?q=lang%3Ago+test&patternType=literal')
        })

        it('Does not display tour step when re-visiting a page with onboardingTour query after already completing ', async () => {
            await driver.page.goto(
                driver.sourcegraphBaseUrl + '/search?q=lang:go+test&patternType=literal&onboardingTour=true'
            )
            await resetOnboardingTour()
            await waitAndFocusInput()
            await driver.page.waitForSelector('.tour-card')
            await driver.page.waitForSelector('.test-tour-step-5')
            await driver.page.waitForSelector('.search-help-dropdown-button')
            await driver.page.click('.search-help-dropdown-button')
            expect(await driver.page.evaluate(() => document.querySelectorAll('.test-tour-step-5').length)).toBe(0)
            await driver.assertWindowLocation('/search?q=lang%3Ago+test&patternType=literal')
            await driver.page.goto(
                driver.sourcegraphBaseUrl + '/search?q=lang:go+test&patternType=literal&onboardingTour=true'
            )
            await driver.page.waitForSelector('.search-help-dropdown-button')
            expect(await driver.page.evaluate(() => document.querySelectorAll('.test-tour-step-5').length)).toBe(0)
        })

        it('Does not display tour step when re-visiting a page with onboardingTour query after already closing tour ', async () => {
            await driver.page.goto(
                driver.sourcegraphBaseUrl + '/search?q=lang:go+test&patternType=literal&onboardingTour=true'
            )
            await resetOnboardingTour()
            await waitAndFocusInput()
            await driver.page.waitForSelector('.tour-card')
            await driver.page.waitForSelector('.test-tour-step-5')
            await driver.page.waitForSelector('.test-tour-close-button')
            await driver.page.click('.test-tour-close-button')
            expect(await driver.page.evaluate(() => document.querySelectorAll('.test-tour-step-5').length)).toBe(0)
            await driver.assertWindowLocation('/search?q=lang%3Ago+test&patternType=literal')
            await driver.page.goto(
                driver.sourcegraphBaseUrl + '/search?q=lang:go+test&patternType=literal&onboardingTour=true'
            )
            await driver.page.waitForSelector('.search-help-dropdown-button')
            expect(await driver.page.evaluate(() => document.querySelectorAll('.test-tour-step-5').length)).toBe(0)
        })
    })
})
