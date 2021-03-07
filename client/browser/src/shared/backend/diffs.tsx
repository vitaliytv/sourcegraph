import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { RepoNotFoundError } from '../../../../shared/src/backend/errors'
import { dataOrThrowErrors, gql } from '../../../../shared/src/graphql/graphql'
import { PlatformContext } from '../../../../shared/src/platform/context'
import { memoizeObservable } from '../../../../shared/src/util/memoizeObservable'
import {
    FileDiffConnectionFields,
    RepositoryComparisonDiffResult,
    RepositoryComparisonDiffVariables,
} from '../../graphql-operations'

export const queryRepositoryComparisonFileDiffs = memoizeObservable(
    ({
        requestGraphQL,
        ...args
    }: {
        repo: string
        base: string | null
        head: string | null
        first?: number
    } & Pick<PlatformContext, 'requestGraphQL'>): Observable<FileDiffConnectionFields> =>
        requestGraphQL<RepositoryComparisonDiffResult, RepositoryComparisonDiffVariables>({
            request: gql`
                query RepositoryComparisonDiff($repo: String!, $base: String, $head: String, $first: Int) {
                    repository(name: $repo) {
                        comparison(base: $base, head: $head) {
                            fileDiffs(first: $first) {
                                ...FileDiffConnectionFields
                            }
                        }
                    }
                }

                fragment FileDiffConnectionFields on FileDiffConnection {
                    nodes {
                        ...FileDiffFields
                    }
                    totalCount
                }

                fragment FileDiffFields on FileDiff {
                    oldPath
                    newPath
                    internalID
                }
            `,
            variables: { repo: args.repo, base: args.base, head: args.head, first: args.first ?? null },
            mightContainPrivateInfo: true,
        }).pipe(
            map(dataOrThrowErrors),
            map(({ repository }) => {
                if (!repository) {
                    throw new RepoNotFoundError(args.repo)
                }
                if (!repository.comparison || !repository.comparison.fileDiffs) {
                    throw new Error('empty fileDiffs')
                }
                return repository.comparison.fileDiffs
            })
        ),
    ({ repo, base, head, first }) => `${repo}:${String(base)}:${String(head)}:${String(first)}`
)
