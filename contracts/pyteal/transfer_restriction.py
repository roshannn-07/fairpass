from pyteal import *

def approval():

    allowed = Bytes("allowed_sender")

    on_create = Seq([
        App.globalPut(allowed, Txn.sender()),
        Return(Int(1))
    ])

    handle_transfer = Seq([
        Assert(Txn.sender() == App.globalGet(allowed)),
        Return(Int(1))
    ])

    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.NoOp, handle_transfer],
    )

    return program

def clear():
    return Return(Int(1))

if __name__ == "__main__":
    print(compileTeal(approval(), mode=Mode.Application, version=8))
