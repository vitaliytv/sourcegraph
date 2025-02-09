import * as H from 'history'
import React, { useEffect, useCallback } from 'react'
import { Observable } from 'rxjs'

import * as GQL from '@sourcegraph/shared/src/graphql/schema'

import { FilteredConnection, FilteredConnectionQueryArguments } from '../../components/FilteredConnection'
import { PageTitle } from '../../components/PageTitle'
import { GitRefType, Scalars } from '../../graphql-operations'
import { eventLogger } from '../../tracking/eventLogger'
import { GitReferenceNode, queryGitReferences as queryGitReferencesFromBackend } from '../GitReference'

import { RepositoryReleasesAreaPageProps } from './RepositoryReleasesArea'

interface Props extends RepositoryReleasesAreaPageProps {
    history: H.History
    location: H.Location
    queryGitReferences?: (args: {
        repo: Scalars['ID']
        first?: number
        query?: string
        type: GitRefType
        withBehindAhead?: boolean
    }) => Observable<GQL.IGitRefConnection>
}

/** A page that shows all of a repository's tags. */
export const RepositoryReleasesTagsPage: React.FunctionComponent<Props> = ({
    repo,
    history,
    location,
    queryGitReferences: queryGitReferences = queryGitReferencesFromBackend,
}) => {
    useEffect(() => {
        eventLogger.logViewEvent('RepositoryReleasesTags')
    }, [])

    const queryTags = useCallback(
        (args: FilteredConnectionQueryArguments): Observable<GQL.IGitRefConnection> =>
            queryGitReferences({ ...args, repo: repo.id, type: GitRefType.GIT_TAG }),
        [repo.id, queryGitReferences]
    )

    return (
        <div className="repository-releases-page">
            <PageTitle title="Tags" />
            <FilteredConnection<GQL.IGitRef>
                className="my-3"
                listClassName="list-group list-group-flush"
                noun="tag"
                pluralNoun="tags"
                queryConnection={queryTags}
                nodeComponent={GitReferenceNode}
                defaultFirst={20}
                autoFocus={true}
                history={history}
                location={location}
            />
        </div>
    )
}
