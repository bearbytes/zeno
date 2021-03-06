import immer from 'immer'
import { StoreInterface } from './StoreInterface'
import { CreateStoreClassOptions } from './StoreClass'
import { StoreInstance } from './StoreInstance'
import { StoreState } from './State'
import { AnyMessage } from './Messages'

// A Reducer takes some State and a Message, and returns new State.
// The Reducer must not modify the original State.
export type Reducer<TState, TMessage> = (
  state: TState,
  message: TMessage
) => TState

export type StoreReducer<T extends StoreInterface> = Reducer<
  StoreState<T>,
  AnyMessage<T>
>

export function createReducer<T extends StoreInterface>(
  options: CreateStoreClassOptions<T>,
  storeInstance: StoreInstance<T>
): StoreReducer<T> {
  return (prevState, message) => {
    // Extract message type and payload from the message
    const { type, ...payload } = message

    // Find the messageHandler for that message type
    const messageHandler = options.messageHandlers[type]

    // Reducer must not mutate prevState, so pass it to immer to allow for mutation
    const nextState: StoreState<T> = immer(prevState, (draft) => {
      // Pass the draft into the messageHandler, which might mutate it.
      // Unfortunately, TypeScript does not realize that the payload is valid here.
      const nextStateOrThunk = messageHandler(
        draft,
        payload as any,
        storeInstance
      )

      if (typeof nextStateOrThunk == 'function') {
        // Execute the returned thunk
        const thunk = nextStateOrThunk
        const { dispatch, getState } = storeInstance
        thunk(dispatch, getState)

        // draft modified inplace, return void
        return
      } else {
        return nextState
      }
    })

    return nextState
  }
}
